import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteFolder,
  deleteGarment,
  listFolders,
  listGarments,
  renameFolder,
  updateGarment,
  uploadGarment,
} from "../lib/wardrobe";
import type { Folder, Formality, Garment, GarmentTags, Season } from "../lib/types";
import { tagGarment } from "../lib/ai";
import Sheet from "../components/Sheet";
import ConfirmSheet from "../components/ConfirmSheet";
import PageHeader from "../components/PageHeader";
import Silhouette from "../components/Silhouette";
import { useI18n, type MessageKey } from "../lib/i18n";
import TagPills from "../components/TagPills";
import { BackIcon, CameraIcon, EditIcon, GalleryIcon, PlusIcon, SparkleIcon, TrashIcon } from "../components/Icons";

export default function Carpeta() {
  const { folderId = "" } = useParams();
  const navigate = useNavigate();
  const { t, plural, lang } = useI18n();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [garments, setGarments] = useState<Garment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmFolder, setConfirmFolder] = useState(false);
  const [selected, setSelected] = useState<Garment | null>(null);
  const [tagging, setTagging] = useState<Set<string>>(new Set());
  const [season, setSeason] = useState<Season | null>(null);
  const [formality, setFormality] = useState<Formality | null>(null);

  // Etiqueta una prenda con IA en segundo plano y actualiza la grilla al terminar.
  const autoTag = useCallback(
    async (g: Garment) => {
      setTagging((prev) => new Set(prev).add(g.id));
      try {
        const { tags, description } = await tagGarment(g.id, lang);
        setGarments((prev) => prev?.map((x) => (x.id === g.id ? { ...x, tags, description } : x)) ?? prev);
        setSelected((prev) => (prev?.id === g.id ? { ...prev, tags, description } : prev));
      } catch {
        /* sin etiquetas: se puede reintentar desde el detalle de la prenda */
      } finally {
        setTagging((prev) => {
          const next = new Set(prev);
          next.delete(g.id);
          return next;
        });
      }
    },
    [lang],
  );

  const folder = folders.find((f) => f.id === folderId);

  const load = useCallback(async () => {
    try {
      const [f, g] = await Promise.all([listFolders(), listGarments(folderId)]);
      setFolders(f);
      setGarments(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("folder.loadError"));
    }
  }, [folderId]);

  useEffect(() => {
    load();
  }, [load]);

  if (garments && folders.length && !folder) {
    return (
      <section className="page">
        <p className="msg msg-error">{t("folder.notFound")}</p>
        <Link to="/ropero" className="btn btn-outline">
          {t("folder.back")}
        </Link>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="navbar">
        <Link to="/ropero" className="back-link">
          <BackIcon width={22} height={22} /> {t("tab.wardrobe")}
        </Link>
        <div className="navbar-actions">
          <button className="icon-btn" onClick={() => setRenaming(true)} aria-label={t("folder.rename")} disabled={!folder}>
            <EditIcon width={21} height={21} />
          </button>
          <button className="icon-btn" onClick={() => setConfirmFolder(true)} aria-label={t("folder.delete")} disabled={!folder}>
            <TrashIcon width={21} height={21} />
          </button>
        </div>
      </div>

      <PageHeader title={folder?.name ?? "…"} subtitle={garments ? plural("garments", garments.length) : undefined} />

      {error && <p className="msg msg-error">{error}</p>}
      {!garments && !error && <div className="spinner" />}

      {garments && garments.length === 0 && (
        <div className="empty fade-in">
          <Silhouette kind="camisa" width={64} />
          <p className="empty-title">{t("folder.emptyTitle")}</p>
          <p className="muted">{t("folder.emptyText")}</p>
        </div>
      )}

      {garments && garments.some((g) => g.tags) && (
        <div className="filters">
          <FilterRow
            options={["summer", "winter", "mid"] as Season[]}
            value={season}
            onChange={setSeason}
            label={(s) => t(`season.${s}` as MessageKey)}
            allLabel={t("filter.all")}
          />
          <FilterRow
            options={["casual", "smart", "formal", "sport"] as Formality[]}
            value={formality}
            onChange={setFormality}
            label={(f) => t(`formality.${f}` as MessageKey)}
            allLabel={t("filter.all")}
          />
        </div>
      )}

      {garments && garments.length > 0 && (
        <div className="garment-grid">
          {garments.filter((g) => matches(g.tags, season, formality)).map((g, i) => (
            <button
              key={g.id}
              className="garment-card fade-in"
              style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
              onClick={() => setSelected(g)}
            >
              <div className="photo">
                <img src={g.thumb_url} alt={g.description ?? t("garment.alt")} loading="lazy" />
                {tagging.has(g.id) && <span className="photo-badge">{t("tags.analyzing")}</span>}
              </div>
              {g.description && <span className="garment-desc">{g.description}</span>}
            </button>
          ))}
        </div>
      )}

      <button className="floating-pill" onClick={() => setAdding(true)}>
        <PlusIcon width={18} height={18} /> {t("folder.add")}
      </button>

      <AddGarmentSheet
        open={adding}
        folderId={folderId}
        folders={folders}
        onClose={() => setAdding(false)}
        onAdded={(g) => {
          if (g.folder_id === folderId) setGarments((prev) => [g, ...(prev ?? [])]);
          autoTag(g);
        }}
      />

      <RenameSheet
        open={renaming}
        current={folder?.name ?? ""}
        onClose={() => setRenaming(false)}
        onSave={async (name) => {
          await renameFolder(folderId, name);
          setFolders(folders.map((f) => (f.id === folderId ? { ...f, name } : f)));
        }}
      />

      <ConfirmSheet
        open={confirmFolder}
        title={t("folder.delete")}
        message={t("folder.deleteMessage", {
          name: folder?.name ?? "",
          extra: garments?.length ? t("folder.deleteExtra", { items: plural("garments", garments.length) }) : "",
        })}
        confirmLabel={t("folder.delete")}
        onClose={() => setConfirmFolder(false)}
        onConfirm={async () => {
          await deleteFolder(folderId);
          navigate("/ropero", { replace: true });
        }}
      />

      {selected && (
        <GarmentSheet
          garment={selected}
          folders={folders}
          onClose={() => setSelected(null)}
          onChanged={(g, moved) => {
            setGarments((prev) => (moved ? prev!.filter((x) => x.id !== g.id) : prev!.map((x) => (x.id === g.id ? g : x))));
          }}
          onDeleted={(g) => setGarments((prev) => prev!.filter((x) => x.id !== g.id))}
          tagging={tagging.has(selected.id)}
          onAnalyze={() => autoTag(selected)}
        />
      )}
    </section>
  );
}

// ───────────────────────── Campos compartidos ─────────────────────────

function GarmentFields({
  description,
  setDescription,
  folderId,
  setFolderId,
  folders,
}: {
  description: string;
  setDescription: (v: string) => void;
  folderId: string;
  setFolderId: (v: string) => void;
  folders: Folder[];
}) {
  const { t } = useI18n();
  return (
    <div className="group">
      <label className="group-field">
        <span>{t("garment.description")}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("garment.descriptionPlaceholder")}
          maxLength={500}
          rows={2}
        />
      </label>
      <label className="group-row">
        <span>{t("garment.folder")}</span>
        <select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

// ───────────────────────── Subir prenda ─────────────────────────

function AddGarmentSheet({
  open,
  folderId,
  folders,
  onClose,
  onAdded,
}: {
  open: boolean;
  folderId: string;
  folders: Folder[];
  onClose: () => void;
  onAdded: (g: Garment) => void;
}) {
  const { t } = useI18n();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState(folderId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setTarget(folderId);
  }, [open, folderId]);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = () => {
    setFile(null);
    setDescription("");
    setError(null);
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  async function save() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const g = await uploadGarment(file, target, description);
      onAdded(g);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("garment.uploadError"));
    } finally {
      setBusy(false);
    }
  }

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = "";
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={t("garment.new")}
      action={{ label: busy ? t("common.saving") : t("common.save"), onClick: save, disabled: busy || !file }}
    >
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onPick} />

      <div className="photo photo-preview">
        {preview ? <img src={preview} alt={t("garment.preview")} /> : <Silhouette kind="camisa" width={150} strokeWidth={1} />}
      </div>

      <div className="two-buttons">
        <button className="btn btn-primary" onClick={() => cameraRef.current?.click()} disabled={busy}>
          <CameraIcon width={20} height={20} /> {t("garment.camera")}
        </button>
        <button className="btn btn-outline" onClick={() => galleryRef.current?.click()} disabled={busy}>
          <GalleryIcon width={20} height={20} /> {t("garment.gallery")}
        </button>
      </div>

      <GarmentFields
        description={description}
        setDescription={setDescription}
        folderId={target}
        setFolderId={setTarget}
        folders={folders}
      />
      {error && <p className="msg msg-error">{error}</p>}
    </Sheet>
  );
}

// ───────────────────────── Ver / editar prenda ─────────────────────────

function GarmentSheet({
  garment,
  folders,
  onClose,
  onChanged,
  onDeleted,
  tagging,
  onAnalyze,
}: {
  garment: Garment;
  folders: Folder[];
  onClose: () => void;
  onChanged: (g: Garment, moved: boolean) => void;
  onDeleted: (g: Garment) => void;
  tagging: boolean;
  onAnalyze: () => void;
}) {
  const { t } = useI18n();
  const [description, setDescription] = useState(garment.description ?? "");

  // Si la IA completó la descripción mientras el panel estaba abierto, mostrarla.
  useEffect(() => {
    setDescription((d) => d || garment.description || "");
  }, [garment.description]);
  const [folderId, setFolderId] = useState(garment.folder_id);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = description !== (garment.description ?? "") || folderId !== garment.folder_id;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const patch = { description: description.trim() || null, folder_id: folderId };
      await updateGarment(garment.id, patch);
      onChanged({ ...garment, ...patch }, folderId !== garment.folder_id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("garment.saveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Sheet
        open={!confirm}
        onClose={onClose}
        title={t("garment.title")}
        cancelLabel={t("common.close")}
        action={{ label: busy ? t("common.saving") : t("common.save"), onClick: save, disabled: busy || !dirty }}
      >
        <div className="photo photo-preview">
          <img src={garment.image_url} alt={garment.description ?? t("garment.alt")} />
        </div>
        {garment.tags ? (
          <TagPills tags={garment.tags} />
        ) : (
          <button className="btn btn-outline btn-block" onClick={onAnalyze} disabled={tagging}>
            <SparkleIcon width={18} height={18} /> {tagging ? t("tags.analyzing") : t("tags.analyze")}
          </button>
        )}
        <GarmentFields
          description={description}
          setDescription={setDescription}
          folderId={folderId}
          setFolderId={setFolderId}
          folders={folders}
        />
        {error && <p className="msg msg-error">{error}</p>}
        <button className="btn btn-danger-text btn-block" onClick={() => setConfirm(true)} disabled={busy}>
          {t("garment.delete")}
        </button>
      </Sheet>
      <ConfirmSheet
        open={confirm}
        title={t("garment.delete")}
        message={t("garment.deleteMessage")}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          await deleteGarment(garment);
          onDeleted(garment);
          onClose();
        }}
      />
    </>
  );
}

// ───────────────────────── Renombrar carpeta ─────────────────────────

function RenameSheet({
  open,
  current,
  onClose,
  onSave,
}: {
  open: boolean;
  current: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setName(current);
  }, [open, current]);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("folder.renameError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("folder.renameTitle")}
      action={{ label: busy ? t("common.saving") : t("common.save"), onClick: submit, disabled: busy || !name.trim() }}
    >
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="field">
          <span>{t("common.name")}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus required />
        </label>
        {error && <p className="msg msg-error">{error}</p>}
      </form>
    </Sheet>
  );
}

// ───────────────────────── Filtros por etiqueta ─────────────────────────

function matches(tags: GarmentTags | undefined, season: Season | null, formality: Formality | null) {
  if (!season && !formality) return true;
  if (!tags) return false;
  const seasonOk = !season || tags.season === season || tags.season === "all";
  const formalityOk = !formality || tags.formality === formality;
  return seasonOk && formalityOk;
}

function FilterRow<T extends string>({
  options,
  value,
  onChange,
  label,
  allLabel,
}: {
  options: T[];
  value: T | null;
  onChange: (v: T | null) => void;
  label: (v: T) => string;
  allLabel: string;
}) {
  return (
    <div className="chips chips-scroll">
      <button className="chip chip-sm" aria-pressed={value === null} onClick={() => onChange(null)}>
        {allLabel}
      </button>
      {options.map((o) => (
        <button key={o} className="chip chip-sm" aria-pressed={value === o} onClick={() => onChange(value === o ? null : o)}>
          {label(o)}
        </button>
      ))}
    </div>
  );
}
