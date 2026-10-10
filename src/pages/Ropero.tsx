import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { createFolder, listFolders, listGarments } from "../lib/wardrobe";
import type { Folder, Garment } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { firstName } from "../lib/user";
import PageHeader from "../components/PageHeader";
import Sheet from "../components/Sheet";
import AccountSheet from "../components/AccountSheet";
import { HangerIcon, PlusIcon } from "../components/Icons";

const plural = (n: number) => `${n} ${n === 1 ? "prenda" : "prendas"}`;

export default function Ropero() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [account, setAccount] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([listFolders(), listGarments()])
      .then(([f, g]) => {
        setFolders(f);
        setGarments(g);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No pude cargar tu ropero"));
  }, []);

  async function addFolder(e?: FormEvent) {
    e?.preventDefault();
    if (!folders || !newName.trim()) return;
    setBusy(true);
    try {
      const pos = folders.reduce((m, f) => Math.max(m, f.position), -1) + 1;
      const f = await createFolder(newName, pos);
      setFolders([...folders, f]);
      setNewName("");
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude crear la carpeta");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <PageHeader
        eyebrow={`Bonjour, ${firstName(user)}`}
        title="Ropero"
        subtitle={`${plural(garments.length)} · ${folders?.length ?? 0} carpetas`}
        aside={
          <button className="avatar" onClick={() => setAccount(true)} aria-label="Cuenta">
            {firstName(user).charAt(0).toUpperCase() || "·"}
          </button>
        }
      />

      {error && <p className="msg msg-error">{error}</p>}
      {!folders && !error && <div className="spinner" />}

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
                <span className="folder-count">{items.length ? plural(items.length) : "Vacía"}</span>
              </Link>
            );
          })}
          <button className="folder-card folder-new fade-in" onClick={() => setCreating(true)}>
            <PlusIcon />
            Nueva carpeta
          </button>
        </div>
      )}

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="Nueva carpeta"
        action={{ label: busy ? "Creando…" : "Crear", onClick: () => addFolder(), disabled: busy || !newName.trim() }}
      >
        <form onSubmit={addFolder} className="form">
          <label className="field">
            <span>Nombre</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Vestidos, Trajes, Deportivo…"
              maxLength={40}
              autoFocus
              required
            />
          </label>
        </form>
      </Sheet>

      <AccountSheet open={account} onClose={() => setAccount(false)} />
    </section>
  );
}
