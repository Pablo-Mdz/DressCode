import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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
import type { Folder, Garment } from "../lib/types";
import Sheet from "../components/Sheet";
import ConfirmSheet from "../components/ConfirmSheet";
import { BackIcon, CameraIcon, EditIcon, GalleryIcon, PlusIcon, TrashIcon } from "../components/Icons";

export default function Carpeta() {
  const { folderId = "" } = useParams();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [garments, setGarments] = useState<Garment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmFolder, setConfirmFolder] = useState(false);
  const [selected, setSelected] = useState<Garment | null>(null);

  const folder = folders.find((f) => f.id === folderId);

  const load = useCallback(async () => {
    try {
      const [f, g] = await Promise.all([listFolders(), listGarments(folderId)]);
      setFolders(f);
      setGarments(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pude cargar la carpeta");
    }
  }, [folderId]);

  useEffect(() => {
    load();
  }, [load]);

  if (garments && folders.length && !folder) {
    return (
      <section className="page">
        <p className="msg msg-error">Esta carpeta no existe.</p>
        <Link to="/ropero" className="btn btn-ghost">
          Volver al ropero
        </Link>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="folder-bar">
        <button className="icon-btn" onClick={() => navigate("/ropero")} aria-label="Volver">
          <BackIcon />
        </button>
        <div className="folder-bar-actions">
          <button className="icon-btn" onClick={() => setRenaming(true)} aria-label="Renombrar carpeta" disabled={!folder}>
            <EditIcon />
          </button>
          <button className="icon-btn" onClick={() => setConfirmFolder(true)} aria-label="Eliminar carpeta" disabled={!folder}>
            <TrashIcon />
          </button>
        </div>
      </div>

      <header className="page-head reveal">
        <p className="eyebrow">Carpeta</p>
        <h1 className="page-title">
          <em>{folder?.name ?? "…"}</em>
        </h1>
        {garments && (
          <p className="page-sub">
            {garments.length} {garments.length === 1 ? "prenda" : "prendas"}
          </p>
        )}
      </header>

      {error && <p className="msg msg-error">{error}</p>}
      {!garments && !error && <div className="loader" />}

      {garments && garments.length === 0 && (
        <div className="empty reveal">
          <p>Todavía no hay prendas acá.</p>
          <p className="muted">Sacale una foto a tu primera prenda.</p>
          <button className="btn btn-gold" onClick={() => setAdding(true)}>
            <CameraIcon /> Agregar prenda
          </button>
        </div>
      )}

      {garments && garments.length > 0 && (
        <div className="garment-grid">
          {garments.map((g, i) => (
            <button
              key={g.id}
              className="garment-card reveal"
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
              onClick={() => setSelected(g)}
            >
              <div className="frame">
                <img src={g.thumb_url} alt={g.description ?? "Prenda"} loading="lazy" />
              </div>
              {g.description && <p className="garment-desc">{g.description}</p>}
            </button>
          ))}
        </div>
      )}

      {garments && garments.length > 0 && (
        <button className="fab" onClick={() => setAdding(true)} aria-label="Agregar prenda">
          <PlusIcon width={28} height={28} />
        </button>
      )}

      <AddGarmentSheet
        open={adding}
        folderId={folderId}
        onClose={() => setAdding(false)}
        onAdded={(g) => setGarments((prev) => [g, ...(prev ?? [])])}
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
        title="Eliminar carpeta"
        message={`Se eliminará "${folder?.name}" y ${garments?.length ? `sus ${garments.length} prendas` : "todo su contenido"}. Esta acción no se puede deshacer.`}
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
        />
      )}
    </section>
  );
}

// ───────────────────────── Subir prenda ─────────────────────────

function AddGarmentSheet({
  open,
  folderId,
  onClose,
  onAdded,
}: {
  open: boolean;
  folderId: string;
  onClose: () => void;
  onAdded: (g: Garment) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const g = await uploadGarment(file, folderId, description);
      onAdded(g);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude subir la foto");
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
    <Sheet open={open} onClose={close} title="Nueva prenda">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onPick} />

      {!file ? (
        <div className="pick-grid">
          <button className="pick" onClick={() => cameraRef.current?.click()}>
            <CameraIcon width={34} height={34} />
            <span>Cámara</span>
          </button>
          <button className="pick" onClick={() => galleryRef.current?.click()}>
            <GalleryIcon width={34} height={34} />
            <span>Galería</span>
          </button>
        </div>
      ) : (
        <form onSubmit={save} className="form">
          <div className="frame frame-preview">{preview && <img src={preview} alt="Vista previa" />}</div>
          <button type="button" className="link center" onClick={() => setFile(null)} disabled={busy}>
            Elegir otra foto
          </button>
          <label className="field">
            <span>Descripción (opcional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Camisa de lino blanca, corte slim. Ideal verano."
              maxLength={500}
              rows={3}
            />
          </label>
          {error && <p className="msg msg-error">{error}</p>}
          <button className="btn btn-gold btn-block" disabled={busy}>
            {busy ? "Guardando…" : "Guardar en el ropero"}
          </button>
        </form>
      )}
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
}: {
  garment: Garment;
  folders: Folder[];
  onClose: () => void;
  onChanged: (g: Garment, moved: boolean) => void;
  onDeleted: (g: Garment) => void;
}) {
  const [description, setDescription] = useState(garment.description ?? "");
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
      setError(e instanceof Error ? e.message : "No pude guardar los cambios");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Sheet open={!confirm} onClose={onClose} title="Prenda">
        <div className="frame frame-preview">
          <img src={garment.image_url} alt={garment.description ?? "Prenda"} />
        </div>
        <div className="form">
          <label className="field">
            <span>Descripción</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} />
          </label>
          <label className="field">
            <span>Carpeta</span>
            <select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="msg msg-error">{error}</p>}
          <div className="row-actions">
            <button className="btn btn-danger-ghost" onClick={() => setConfirm(true)} disabled={busy}>
              <TrashIcon /> Eliminar
            </button>
            <button className="btn btn-gold" onClick={save} disabled={busy || !dirty}>
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </Sheet>
      <ConfirmSheet
        open={confirm}
        title="Eliminar prenda"
        message="La foto se borrará de tu ropero. Esta acción no se puede deshacer."
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
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setName(current);
  }, [open, current]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude renombrar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Renombrar carpeta">
      <form onSubmit={submit} className="form">
        <label className="field">
          <span>Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus required />
        </label>
        {error && <p className="msg msg-error">{error}</p>}
        <button className="btn btn-gold btn-block" disabled={busy || !name.trim()}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </Sheet>
  );
}
