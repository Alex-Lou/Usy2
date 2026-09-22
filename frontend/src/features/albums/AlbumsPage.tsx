import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AssetImage } from "../../components/AssetImage";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { createAlbum, listAlbums } from "./api";
import type { Album, Page } from "./types";

export function AlbumsPage() {
  const [data, setData] = useState<Page<Album> | null>(null);
  const [page, setPage] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  function load() {
    listAlbums(page, 12)
      .then(setData)
      .catch(() => {});
  }

  useEffect(load, [page]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await createAlbum(title, description || null);
      setTitle("");
      setDescription("");
      if (page !== 0) setPage(0);
      else load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="text-sm text-text-muted hover:underline">
          ← Accueil
        </Link>
        <h1 className="text-xl font-bold text-primary">Nos albums</h1>
      </div>

      <form onSubmit={submit} className="mb-6 rounded-token border border-border bg-surface p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'album" maxLength={150} className="mb-2" />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optionnel)" maxLength={2000} className="mb-3" />
        <Button type="submit" disabled={creating || !title.trim()}>
          {creating ? "Création…" : "Créer un album"}
        </Button>
      </form>

      {data?.content.length === 0 && (
        <p className="text-center text-text-muted">Aucun album. Créez le premier 📸</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {data?.content.map((album) => (
          <Link
            key={album.id}
            to={`/albums/${album.id}`}
            className="overflow-hidden rounded-token border border-border bg-surface transition-transform hover:-translate-y-0.5"
          >
            <div className="aspect-square bg-bg">
              {album.coverAssetId ? (
                <AssetImage assetId={album.coverAssetId} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl text-text-muted">🖼️</div>
              )}
            </div>
            <div className="p-3">
              <p className="truncate font-semibold text-text">{album.title}</p>
              <p className="text-xs text-text-muted">
                {album.photoCount} photo{album.photoCount > 1 ? "s" : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="rounded-token border border-border px-3 py-1.5 text-sm disabled:opacity-40">
            ← Précédent
          </button>
          <span className="text-sm text-text-muted">Page {page + 1} / {data.totalPages}</span>
          <button onClick={() => setPage((p) => (p + 1 < data.totalPages ? p + 1 : p))} disabled={page + 1 >= data.totalPages}
            className="rounded-token border border-border px-3 py-1.5 text-sm disabled:opacity-40">
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
