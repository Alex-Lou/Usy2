import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AssetImage } from "../../components/AssetImage";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
  deleteAlbum,
  deletePhoto,
  getAlbum,
  listPhotos,
  reorderPhotos,
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

  async function saveCaption(photo: Photo) {
    await updatePhotoCaption(albumId, photo.id, photo.caption ?? "");
  }

  async function removePhoto(photoId: number) {
    if (!window.confirm("Supprimer cette photo ?")) return;
    await deletePhoto(albumId, photoId);
    setPhotos((list) => list.filter((p) => p.id !== photoId));
  }

  async function saveAlbum() {
    if (!title.trim()) return;
    const updated = await updateAlbum(albumId, title, description || null);
    setAlbum(updated);
    setEditing(false);
  }

  async function removeAlbum() {
    if (!window.confirm("Supprimer cet album et toutes ses photos ?")) return;
    await deleteAlbum(albumId);
    navigate("/albums", { replace: true });
  }

  if (!album) {
    return <div className="p-8 text-text-muted">Chargement…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/albums" className="text-sm text-text-muted hover:underline">
          ← Albums
        </Link>
        {!editing && (
          <div className="flex gap-2 text-sm">
            <button onClick={() => setEditing(true)} className="text-text-muted hover:underline">Éditer</button>
            <button onClick={removeAlbum} className="text-text-muted hover:text-danger">Supprimer</button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="mb-6 rounded-token border border-border bg-surface p-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} className="mb-2" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Description" className="mb-3" />
          <div className="flex gap-2">
            <Button onClick={saveAlbum}>Enregistrer</Button>
            <button onClick={() => setEditing(false)} className="rounded-token border border-border px-4 py-2">Annuler</button>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">{album.title}</h1>
          {album.description && <p className="mt-1 text-text-muted">{album.description}</p>}
        </div>
      )}

      <div className="mb-6">
        <PhotoUploader albumId={albumId} onUploaded={refresh} />
      </div>

      {photos.length === 0 ? (
        <p className="text-center text-text-muted">Aucune photo. Ajoutez-en depuis votre téléphone 📷</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {photos.map((photo, i) => (
            <div key={photo.id} className="overflow-hidden rounded-token border border-border bg-surface">
              <button onClick={() => setLightbox(i)} className="block aspect-square w-full bg-bg">
                <AssetImage assetId={photo.assetId} className="h-full w-full object-cover" />
              </button>
              <div className="p-2">
                <input
                  value={photo.caption ?? ""}
                  onChange={(e) => setCaptionLocal(photo.id, e.target.value)}
                  onBlur={() => saveCaption(photo)}
                  maxLength={500}
                  placeholder="Légende…"
                  className="mb-2 w-full rounded border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-primary"
                />
                <div className="flex items-center justify-between text-xs">
                  <div className="flex gap-1">
                    <button onClick={() => move(i, -1)} aria-label="Monter" className="rounded border border-border px-2 hover:bg-bg">↑</button>
                    <button onClick={() => move(i, 1)} aria-label="Descendre" className="rounded border border-border px-2 hover:bg-bg">↓</button>
                  </div>
                  <button onClick={() => removePhoto(photo.id)} className="text-text-muted hover:text-danger">Supprimer</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          <AssetImage assetId={photos[lightbox].assetId} className="max-h-[80vh] max-w-full rounded-token object-contain" />
          {photos[lightbox].caption && (
            <p className="mt-3 text-center text-white">{photos[lightbox].caption}</p>
          )}
          <button className="mt-4 rounded-token bg-white/90 px-4 py-2 text-sm font-semibold text-black">Fermer</button>
        </div>
      )}
    </div>
  );
}
