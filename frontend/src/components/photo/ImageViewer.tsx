import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../features/auth/useAuth";
import { downloadAsset } from "../../features/chat/attachments";
import { HiddenNotesPanel, PawLayer, useHiddenNotes } from "../../features/hidden/HiddenNotes";
import { setProfilePhoto } from "../../features/profile/api";
import type { Asset } from "../../lib/api/assets";
import { AssetImage } from "../AssetImage";
import { Icon } from "../ui/Icon";

/**
 * Full-screen photo/GIF viewer (chat, feed, profile) with a download button and
 * "use as my profile photo / cover". Esc or tap outside closes.
 * `badge`: drawn over the photo's bottom-right corner (e.g. the companion on an avatar).
 * `hiddenNotes`: a post's photo, where a 🐾 note can be hidden or found.
 * Rendered on <body>: an animated (transformed) card would otherwise trap `position: fixed`.
 */
export function ImageViewer({
  asset,
  onClose,
  badge,
  hiddenNotes = false,
}: {
  asset: Pick<Asset, "id" | "originalFilename">;
  onClose: () => void;
  badge?: ReactNode;
  hiddenNotes?: boolean;
}) {
  const hidden = useHiddenNotes(asset.id, hiddenNotes);
  const { refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function applyToProfile(kind: "avatar" | "cover") {
    setSaving(true);
    setMessage(null);
    try {
      await setProfilePhoto(kind, asset.id);
      setMessage(kind === "avatar" ? "✓ C'est ta photo de profil" : "✓ C'est ta couverture de profil");
      if (kind === "avatar") void refreshUser().catch(() => {}); // header/avatar reflect the new photo
    } catch {
      setMessage("La photo n'a pas pu être utilisée pour ton profil.");
    } finally {
      setSaving(false);
    }
  }

  const action = "rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white press hover:bg-white/25 disabled:opacity-50";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      className="fixed inset-0 z-50 flex flex-col bg-black/90 animate-fade-up"
      onClick={onClose}
    >
      <div className="flex justify-end gap-2 px-4 pb-2 pt-[calc(var(--safe-top)+0.75rem)]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void downloadAsset(asset);
          }}
          aria-label="Enregistrer"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white press hover:bg-white/20"
        >
          <Icon name="download" size={20} />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white press hover:bg-white/20"
        >
          <Icon name="x" size={20} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        <div onClick={(e) => e.stopPropagation()} className="relative max-h-full max-w-full">
          <AssetImage assetId={asset.id} className="max-h-[70dvh] max-w-full rounded-token object-contain" />
          {badge && <div className="absolute bottom-2 right-2">{badge}</div>}
          {hiddenNotes && <PawLayer notes={hidden.notes} onFound={hidden.found} />}
        </div>
      </div>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      >
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" disabled={saving} onClick={() => void applyToProfile("avatar")} className={action}>
            Photo de profil
          </button>
          <button type="button" disabled={saving} onClick={() => void applyToProfile("cover")} className={action}>
            Couverture du profil
          </button>
        </div>
        {message && <p className="text-center text-sm text-white">{message}</p>}
        {hiddenNotes && <HiddenNotesPanel assetId={asset.id} notes={hidden.notes} revealed={hidden.revealed} onChanged={hidden.reload} />}
      </div>
    </div>,
    document.body,
  );
}
