import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createFolder, listFolders, listGarments } from "../lib/wardrobe";
import type { Folder, Garment } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { firstName } from "../lib/user";
import { useI18n } from "../lib/i18n";
import { tagGarment } from "../lib/ai";
import PageHeader from "../components/PageHeader";
import Sheet from "../components/Sheet";
import AccountSheet from "../components/AccountSheet";
import { CameraIcon, HangerIcon, PlusIcon, SparkleIcon } from "../components/Icons";

// Prendas recién subidas que la IA todavía está etiquetando no cuentan como "sin etiquetar".
const TAGGING_GRACE_MS = 5 * 60 * 1000;

export default function Ropero() {
  const { user } = useAuth();
  const { t, plural, lang } = useI18n();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [account, setAccount] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const creatingRef = useRef(false); // Enter repetido en el formulario: una sola carpeta
  const navigate = useNavigate();

  const load = () =>
    Promise.all([listFolders(), listGarments()])
      .then(([f, g]) => {
        setFolders(f);
        setGarments(g);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("wardrobe.loadError")));

  useEffect(() => {
    load();
  }, []);

  // Etiqueta con IA, de a una, las prendas subidas antes de que existiera el etiquetado.
  async function tagAll() {
    const pending = garments.filter((g) => !g.tags && Date.now() - g.created_at > TAGGING_GRACE_MS);
    setError(null);
    setProgress({ done: 0, total: pending.length });
    for (let i = 0; i < pending.length; i++) {
      try {
        const { tags, description } = await tagGarment(pending[i].id, lang);
        setGarments((prev) => prev.map((x) => (x.id === pending[i].id ? { ...x, tags, description } : x)));
      } catch (err) {
        // Si falla una, casi seguro fallan todas (función sin publicar, sin crédito…): se corta y se avisa.
        setError(err instanceof Error ? err.message : t("tags.error"));
        break;
      }
      setProgress({ done: i + 1, total: pending.length });
    }
    setProgress(null);
  }

  const untagged = garments.filter((g) => !g.tags && Date.now() - g.created_at > TAGGING_GRACE_MS).length;
  const initial = firstName(user).match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? "·";

  async function addFolder(e?: FormEvent) {
    e?.preventDefault();
    if (!folders || !newName.trim() || creatingRef.current) return;
    creatingRef.current = true;
    setBusy(true);
    try {
      const pos = folders.reduce((m, f) => Math.max(m, f.position), -1) + 1;
      const f = await createFolder(newName, pos);
      setFolders([...folders, f]);
      setNewName("");
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("wardrobe.createError"));
    } finally {
      creatingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow={t("wardrobe.hello", { name: firstName(user) })}
        title={t("wardrobe.title")}
        subtitle={`${plural("garments", garments.length)} · ${plural("folders", folders?.length ?? 0)}`}
        aside={
          <button className="avatar" onClick={() => setAccount(true)} aria-label={t("account.title")} title={t("account.title")}>
            {initial}
          </button>
        }
      />

      {error && <p className="msg msg-error">{error}</p>}
      {!folders && !error && <div className="spinner" />}

      {folders && folders.length > 0 && garments.length < 2 && (
        <section className="start-card fade-in" aria-label={t("wardrobe.startTitle")}>
          <h2 className="serif-md">{t("wardrobe.startTitle")}</h2>
          <ol className="start-steps">
            <li>{t("wardrobe.step1")}</li>
            <li>{t("wardrobe.step2")}</li>
          </ol>
          <button className="btn btn-primary btn-block" onClick={() => navigate(`/ropero/${folders[0].id}?add=1`)}>
            <CameraIcon width={20} height={20} /> {garments.length ? t("wardrobe.addAnother") : t("wardrobe.startButton")}
          </button>
        </section>
      )}

      {folders && untagged > 0 && (
        <div className="banner fade-in">
          <div className="banner-text">
            <span className="banner-title">{plural("tags.untagged", untagged)}</span>
            <span className="muted">{t("tags.untaggedText")}</span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={tagAll} disabled={progress !== null}>
            <SparkleIcon width={16} height={16} />
            {progress ? t("tags.progress", { done: progress.done, total: progress.total }) : t("tags.tagAll")}
          </button>
        </div>
      )}

      {folders && (
        <div className="folder-grid">
          {folders.map((f, i) => {
            const items = garments.filter((g) => g.folder_id === f.id);
            const cover = items[0]?.thumb_url;
            return (
              <Link
                key={f.id}
                to={`/ropero/${f.id}`}
                className={`folder-card fade-in ${cover ? "has-cover" : ""}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {cover ? <img src={cover} alt="" /> : <HangerIcon className="folder-icon" width={30} height={30} />}
                <span className="folder-name">{f.name}</span>
                <span className="folder-count">{items.length ? plural("garments", items.length) : t("wardrobe.empty")}</span>
              </Link>
            );
          })}
          <button className="folder-card folder-new fade-in" onClick={() => setCreating(true)}>
            <PlusIcon />
            {t("wardrobe.newFolder")}
          </button>
        </div>
      )}

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title={t("wardrobe.newFolder")}
        action={{ label: busy ? t("common.creating") : t("common.create"), onClick: () => addFolder(), disabled: busy || !newName.trim() }}
      >
        <form onSubmit={addFolder} className="form">
          <label className="field">
            <span>{t("common.name")}</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("wardrobe.folderPlaceholder")}
              maxLength={40}
              autoFocus
              required
            />
          </label>
        </form>
      </Sheet>

      <AccountSheet open={account} onClose={() => setAccount(false)} onFoldersChanged={load} />
    </section>
  );
}
