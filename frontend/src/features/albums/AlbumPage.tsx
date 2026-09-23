import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AssetImage } from "../../components/AssetImage";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Input";
import {
  deleteAlbum,
  deletePhoto,
  getAlbum,
  listPhotos,
  reorderPhotos,
  setAlbumCover,
  updateAlbum,
  updatePhotoCaption,
} from "./api";
import { PhotoUploader } from "./PhotoUploader";
import type { Album, Photo } from "./types";

async function loadAllPhotos(albumId: number): Promise<Photo[]> {
  let page = 0;
  let all: Photo[] = [];
  for (;;) {
    const p = await listPhotos(albumId, page, 100);
    all = all.concat(p.content);
    if (page + 1 >= p.totalPages) break;
    page++;
  }
  return all;
}

export function AlbumPage() {
  const { id } = useParams();
  const albumId = Number(id);
  const navigate = useNavigate();

  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const refresh = useCallback(() => {
    getAlbum(albumId)
      .then((a) => {
        setAlbum(a);
        setTitle(a.title);
        setDescription(a.description ?? "");
      })
      .catch(() => {});
    loadAllPhotos(albumId).then(setPhotos).catch(() => {});
  }, [albumId]);

  useEffect(refresh, [refresh]);

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    setPhotos(next);
    await reorderPhotos(albumId, next.map((p) => p.id));
  }

  function setCaptionLocal(photoId: number, caption: string) {
    setPhotos((list) => list.map((p) => (p.id === photoId ? { ...p, caption } : p)));
  }

  async function removePhoto(photoId: number) {
    if (!window.confirm("Supprimer cette photo ?")) return;
    await deletePhoto(albumId, photoId);
    setPhotos((list) => list.filter((p) => p.id !== photoId));
  }

  async function saveAlbum() {
    if (!title.trim()) return;
    setAlbum(await updateAlbum(albumId, title, description || null));
    setEditing(false);
  }

  async function removeAlbum() {
    if (!window.confirm("Supprimer cet album et toutes ses photos ?")) return;
    await deleteAlbum(albumId);
    navigate("/albums", { replace: true });
  }

  if (!album) return <div className="p-8 text-text-muted">Chargement…</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between animate-fade-up">
        <Link to="/albums" className="flex items-center gap-1 text-sm text-text-muted hover:text-text press">
          <Icon name="chevronLeft" size={16} /> Albums
        </Link>
        {!editing && (
          <div className="flex gap-1">
            <button onClick={() => setEditing(true)} aria-label="Éditer" className="grid h-9 w-9 place-items-center rounded-token-sm text-text-muted hover:text-text press">
              <Icon name="sliders" size={18} />
            </button>
            <button onClick={removeAlbum} aria-label="Supprimer" className="grid h-9 w-9 place-items-center rounded-token-sm text-text-muted hover:text-danger press">
              <Icon name="trash" size={18} />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="card p-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} className="mb-2" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Description" className="mb-3" />
          <div className="flex gap-2">
            <Button onClick={saveAlbum}>Enregistrer</Button>
            <Button variant="surface" onClick={() => setEditing(false)}>Annuler</Button>
          </div>
        </div>
      ) : (
        <div>
          <h1 className="font-display text-3xl font-bold">{album.title}</h1>
          {album.description && <p className="mt-1 text-text-muted">{album.description}</p>}
        </div>
      )}

      <PhotoUploader albumId={albumId} onUploaded={refresh} />

      {photos.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <span className="text-4xl">🖼️</span>
          <p className="text-text-muted">Aucune photo. Ajoutez-en depuis votre téléphone.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, i) => (
            <div key={photo.id} className="card animate-fade-up overflow-hidden p-0">
              <button onClick={() => setLightbox(i)} className="block aspect-square w-full bg-surface-2 press">
                <AssetImage assetId={photo.assetId} className="h-full w-full object-cover" />
              </button>
              <div className="p-2">
                <input
                  value={photo.caption ?? ""}
                  onChange={(e) => setCaptionLocal(photo.id, e.target.value)}
                  onBlur={() => updatePhotoCaption(albumId, photo.id, photo.caption ?? "")}
                  maxLength={500}
                  placeholder="Légende…"
                  className="mb-2 w-full rounded-token-sm border border-border bg-bg-2/50 px-2 py-1 text-sm outline-none focus:border-primary/70"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button onClick={() => move(i, -1)} aria-label="Monter" className="grid h-7 w-7 place-items-center rounded-token-sm border border-border press hover:border-primary/50"><Icon name="arrowUp" size={14} /></button>
                    <button onClick={() => move(i, 1)} aria-label="Descendre" className="grid h-7 w-7 place-items-center rounded-token-sm border border-border press hover:border-primary/50"><Icon name="arrowDown" size={14} /></button>
                  </div>
                  <button onClick={() => removePhoto(photo.id)} aria-label="Supprimer" className="grid h-7 w-7 place-items-center rounded-token-sm text-text-muted hover:text-danger press"><Icon name="trash" size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox !== null && photos[lightbox] && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 animate-pop" onClick={() => setLightbox(null)}>
          <AssetImage assetId={photos[lightbox].assetId} className="max-h-[80vh] max-w-full rounded-token object-contain" />
          {photos[lightbox].caption && <p className="mt-3 text-center text-white">{photos[lightbox].caption}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {album.coverAssetId === photos[lightbox].assetId ? (
              <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white">✓ Couverture de l'album</span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAlbumCover(albumId, photos[lightbox].id).then(setAlbum).catch(() => {});
                }}
                className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white press hover:bg-white/25"
              >
                Utiliser comme couverture
              </button>
            )}
            <button className="rounded-full btn-brand px-5 py-2 text-sm font-semibold press">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
