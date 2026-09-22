import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AssetImage } from "../../components/AssetImage";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";
import { createAlbum, listAlbums } from "./api";
import type { Album } from "./types";

export function AlbumsPage() {
  const [items, setItems] = useState<Album[] | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const p = await listAlbums(pageNum, 12);
      setTotalPages(p.totalPages);
      setPage(p.page);
      setItems((prev) => (pageNum === 0 || !prev ? p.content : [...prev, ...p.content]));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  const hasMore = page + 1 < totalPages;
  const sentinel = useInfiniteScroll<HTMLDivElement>(() => {
    if (!loading && hasMore) load(page + 1);
  }, !loading && hasMore);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await createAlbum(title, description || null);
      setTitle("");
      setDescription("");
      setOpen(false);
      load(0);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between animate-fade-up">
        <h1 className="font-display text-2xl font-bold">Nos albums</h1>
        <Button onClick={() => setOpen((o) => !o)} variant={open ? "surface" : "brand"}>
          <Icon name={open ? "x" : "plus"} size={16} />
          {open ? "Fermer" : "Nouvel album"}
        </Button>
      </header>

      {open && (
        <form onSubmit={submit} className="card animate-fade-up p-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'album" maxLength={150} className="mb-2" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optionnel)" maxLength={2000} className="mb-3" />
          <Button type="submit" disabled={creating || !title.trim()}>{creating ? "Création…" : "Créer"}</Button>
        </form>
      )}

      {items === null ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="aspect-square" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <span className="text-4xl">📸</span>
          <p className="font-display text-xl font-bold">Aucun album</p>
          <p className="text-text-muted">Créez le premier et remplissez-le de souvenirs.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((album) => (
              <Link
                key={album.id}
                to={`/albums/${album.id}`}
                className="group relative aspect-square overflow-hidden rounded-token border border-border bg-surface-2 shadow-card press"
              >
                {album.coverAssetId ? (
                  <AssetImage assetId={album.coverAssetId} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-text-muted">
                    <Icon name="images" size={34} />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="truncate font-semibold text-white">{album.title}</p>
                  <p className="text-xs text-white/70">{album.photoCount} photo{album.photoCount > 1 ? "s" : ""}</p>
                </div>
              </Link>
            ))}
          </div>
          {hasMore && <div ref={sentinel} className="py-4 text-center text-sm text-text-muted">{loading ? "Chargement…" : ""}</div>}
        </>
      )}
    </div>
  );
}
