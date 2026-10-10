import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { createFolder, listFolders, listGarments } from "../lib/wardrobe";
import type { Folder, Garment } from "../lib/types";
import Ornament from "../components/Ornament";
import Sheet from "../components/Sheet";
import { PlusIcon } from "../components/Icons";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
const roman = (n: number) => ROMAN[n] ?? String(n + 1);

export default function Ropero() {
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [f, g] = await Promise.all([listFolders(), listGarments()]);
        setFolders(f);
        setGarments(g);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pude cargar tu ropero");
      }
    })();
  }, []);

  async function addFolder(e: FormEvent) {
    e.preventDefault();
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
      <header className="page-head reveal">
        <p className="eyebrow">Guardarropa</p>
        <h1 className="page-title">
          Mi <em>Ropero</em>
        </h1>
        <p className="page-sub">
          {garments.length} {garments.length === 1 ? "prenda" : "prendas"} · {folders?.length ?? 0} carpetas
        </p>
        <Ornament />
      </header>

      {error && <p className="msg msg-error">{error}</p>}
      {!folders && !error && <div className="loader" />}

      {folders && (
        <div className="folder-grid">
          {folders.map((f, i) => {
            const count = garments.filter((g) => g.folder_id === f.id).length;
            // Portada de cada carpeta: la prenda más reciente.
            const url = garments.find((g) => g.folder_id === f.id)?.thumb_url;
            return (
              <Link
                key={f.id}
                to={`/ropero/${f.id}`}
                className={`folder-card reveal ${url ? "has-cover" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {url ? <img src={url} alt="" className="folder-cover" /> : <div className="folder-tile" aria-hidden />}
                <div className="folder-veil" />
                <span className="folder-num">{roman(i)}</span>
                <div className="folder-info">
                  <h2>{f.name}</h2>
                  <span>
                    {count} {count === 1 ? "prenda" : "prendas"}
                  </span>
                </div>
              </Link>
            );
          })}
          <button
            className="folder-card folder-new reveal"
            style={{ animationDelay: `${folders.length * 60}ms` }}
            onClick={() => setCreating(true)}
          >
            <PlusIcon width={30} height={30} />
            <span>Nueva carpeta</span>
          </button>
        </div>
      )}

      <Sheet open={creating} onClose={() => setCreating(false)} title="Nueva carpeta">
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
          <button className="btn btn-gold btn-block" disabled={busy || !newName.trim()}>
            {busy ? "Creando…" : "Crear carpeta"}
          </button>
        </form>
      </Sheet>
    </section>
  );
}
