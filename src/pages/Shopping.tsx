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
import { BagIcon, CameraIcon, CheckIcon, ChevronIcon, SparkleIcon } from "../components/Icons";
import BuySheet from "../components/BuySheet";
import { useI18n, type MessageKey } from "../lib/i18n";

type Filter = "Todo" | "Esencial" | "Para variar";

const LOADING_LINES: MessageKey[] = ["shop.loading1", "shop.loading2", "shop.loading3"];

export default function Shopping() {
  const { t, plural, lang } = useI18n();
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
  const [buyOpen, setBuyOpen] = useState(false);
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
            gs.map((g) => [g.id, { ...g, label: shortLabel(g.description) || folderName[g.folder_id] || t("garment.alt") }]),
          ),
        );
        setPrefs(shopping.prefs);
        setResult(shopping.result);
        setList(items);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("shop.loadError"));
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
      setResult(await requestShopping(prefs, lang));
      setFilter("Todo");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.genericError"));
    } finally {
      setBusy(false);
    }
  }

  // Un toque por vez por sugerencia: el doble toque no agrega dos veces.
  const listBusy = useRef(new Set<string>());
  async function toggleList(item: ShoppingItem) {
    if (listBusy.current.has(item.id)) return;
    listBusy.current.add(item.id);
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
      setError(err instanceof Error ? err.message : t("shop.listError"));
    } finally {
      listBusy.current.delete(item.id);
    }
  }

  async function dismiss(item: ShoppingItem) {
    if (!result) return;
    try {
      setResult(await dismissItem(result, item));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shop.saveError"));
    }
  }

  const items = (result?.items ?? []).filter((i) => filter === "Todo" || i.tag === filter);

  return (
    <section className="page">
      <PageHeader
        title={t("shop.title")}
        subtitle={t("shop.subtitle")}
        aside={
          <button
            className="avatar bag-btn"
            onClick={() => setListOpen(true)}
            aria-label={t("shop.listButton", { items: plural("garments", list.length) })}
            title={t("shop.listTitle")}
          >
            <BagIcon width={20} height={20} />
            {list.length > 0 && <span className="badge">{list.length}</span>}
          </button>
        }
      />

      <button className="entry-card" onClick={() => setBuyOpen(true)} disabled={!loaded}>
        <span className="entry-icon">
          <CameraIcon width={22} height={22} />
        </span>
        <span className="entry-text">
          <span className="serif-md">{t("buy.title")}</span>
          <span className="muted">{t("buy.entry")}</span>
        </span>
        <ChevronIcon width={18} height={18} className="chevron" />
      </button>

      <section className="card-outline stack" aria-label={t("shop.guide")}>
        <div className="stack-xs">
          <span className="eyebrow">{t("shop.guide")}</span>
          <h2 className="serif-md">{t("shop.question")}</h2>
        </div>

        <div className="stack-sm">
          <span className="label">{t("shop.style")}</span>
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
                {t(`opt.${s}` as MessageKey)}
              </button>
            ))}
          </div>
        </div>

        <label className="stack-sm">
          <span className="label">{t("shop.notes")}</span>
          <textarea
            className="soft-input"
            rows={3}
            value={prefs.notes}
            onChange={(e) => setPrefs({ ...prefs, notes: e.target.value })}
            placeholder={t("shop.notesPlaceholder")}
            maxLength={600}
            disabled={busy}
          />
        </label>

        <Segmented
          label={t("shop.budget")}
          options={BUDGET_OPTIONS}
          value={prefs.budget}
          onChange={(budget) => setPrefs({ ...prefs, budget })}
          disabled={busy}
        />
        <Segmented
          label={t("shop.season")}
          options={SEASON_OPTIONS}
          value={prefs.season}
          onChange={(season) => setPrefs({ ...prefs, season })}
          disabled={busy}
        />

        <button className="btn btn-primary btn-block" onClick={generate} disabled={busy || !loaded}>
          <SparkleIcon width={18} height={18} />
          {busy ? t("shop.analyzing") : result ? t("shop.update") : t("shop.suggest")}
        </button>
      </section>

      <div ref={resultsRef} className="results-anchor" />

      {busy && (
        <div className="thinking fade-in">
          <div className="spinner" />
          <p key={line} className="fade-in">
            {t(LOADING_LINES[line])}
          </p>
        </div>
      )}

      {error && (
        <p className="msg msg-error">
          {error}
          {error.toLowerCase().includes(t("tab.wardrobe").toLowerCase()) && (
            <>
              {" "}
              <Link to="/ropero">{t("day.goWardrobe")}</Link>
            </>
          )}
        </p>
      )}

      {!busy && result && (
        <>
          <div className="reading fade-in">
            <span className="eyebrow">{t("shop.reading")}</span>
            <p>{result.summary}</p>
          </div>

          <div className="chips">
            {(["Todo", "Esencial", "Para variar"] as Filter[]).map((f) => (
              <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === "Todo" ? t("shop.filter.all") : f === "Esencial" ? t("shop.filter.essential") : t("shop.filter.variety")}
              </button>
            ))}
          </div>

          {items.length === 0 && (
            <div className="empty">
              <p className="empty-title">{t("shop.noItems")}</p>
              <p className="muted">{t("shop.noItemsText")}</p>
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
                    <span className="eyebrow">{t(`shop.tag.${item.tag}` as MessageKey)}</span>
                    <h2 className="serif-md">{item.name}</h2>
                    <span className="swatch-line">
                      <span className="swatch" style={{ background: item.color_hex }} />
                      {item.color_name} · {item.material}
                    </span>
                    {item.new_looks > 0 && (
                      <span className="gain">{plural("shop.newLooks", item.new_looks)}</span>
                    )}
                  </div>
                </div>

                <p className="buy-why">{item.why}</p>

                {item.pair_ids.some((id) => garments[id]) && (
                  <div className="stack-sm">
                    <span className="label">{t("shop.pairsWith")}</span>
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
                        <CheckIcon width={18} height={18} /> {t("shop.inList")}
                      </>
                    ) : (
                      t("shop.addToList")
                    )}
                  </button>
                  <button className="btn btn-outline" onClick={() => dismiss(item)}>
                    {t("shop.haveIt")}
                  </button>
                </div>
              </article>
            );
          })}
        </>
      )}

      {loaded && !busy && !result && !error && (
        <div className="empty">
          <p className="empty-title">{t("shop.emptyTitle")}</p>
          <p className="muted">{t("shop.emptyText")}</p>
        </div>
      )}

      <BuySheet
        open={buyOpen}
        onClose={() => setBuyOpen(false)}
        garments={garments}
        onAddToList={async (item) => {
          try {
            const entry = await addToList(item);
            setList((prev) => [entry, ...prev]);
          } catch (err) {
            setError(err instanceof Error ? err.message : t("shop.listError"));
          }
        }}
      />

      <Sheet open={listOpen} onClose={() => setListOpen(false)} title={t("shop.listTitle")} cancelLabel={t("common.close")}>
        {list.length === 0 ? (
          <div className="empty">
            <p className="empty-title">{t("shop.listEmpty")}</p>
            <p className="muted">{t("shop.listEmptyText")}</p>
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
                  {t("shop.remove")}
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
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="stack-sm">
      <span className="label">{label}</span>
      <div className={`segmented small${options.length > 4 ? " dense" : ""}`} role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)} disabled={disabled}>
            {t(`opt.${o}` as MessageKey)}
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
