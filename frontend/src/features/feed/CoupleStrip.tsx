import { useEffect, useState } from "react";
import { Avatar } from "../../components/ui/Avatar";
import { Icon } from "../../components/ui/Icon";
import { getAllProfiles } from "../profile/api";
import type { Profile } from "../profile/types";

interface Item {
  key: string;
  owner: string;
  avatarAssetId?: number | null;
  companion?: string;
  node: React.ReactNode;
}

function daysTo(date: string): number {
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return NaN;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

// Pulls the "shareable" widgets (countdown, mood) from both profiles into a
// compact strip at the top of the feed, so those widgets are useful day-to-day.
function itemsFrom(profiles: Profile[]): Item[] {
  const items: Item[] = [];
  for (const p of profiles) {
    p.widgets.forEach((w, i) => {
      if (w.type === "countdown") {
        const d = daysTo(w.date);
        if (Number.isNaN(d)) return;
        items.push({
          key: `${p.userId}-${i}`,
          owner: p.displayName,
          avatarAssetId: p.avatarAssetId,
          companion: p.companion,
          node: (
            <span className="flex items-center gap-1.5">
              <Icon name="clock" size={16} className="text-primary" />
              <span className="font-display text-lg font-bold text-text">{d >= 0 ? `J-${d}` : `+${-d}j`}</span>
              {w.label && <span className="text-sm text-text-muted">{w.label}</span>}
            </span>
          ),
        });
      } else if (w.type === "mood") {
        items.push({
          key: `${p.userId}-${i}`,
          owner: p.displayName,
          avatarAssetId: p.avatarAssetId,
          companion: p.companion,
          node: (
            <span className="flex items-center gap-1.5">
              <span className="text-xl">{w.emoji}</span>
              {w.label && <span className="text-sm text-text-muted">{w.label}</span>}
            </span>
          ),
        });
      }
    });
  }
  return items;
}

export function CoupleStrip() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    getAllProfiles()
      .then((profiles) => setItems(itemsFrom(profiles)))
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto pb-1 no-scrollbar animate-fade-up">
      {items.map((it) => (
        <div key={it.key} className="card flex shrink-0 flex-col gap-1.5 px-3.5 py-2.5">
          {it.node}
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <Avatar name={it.owner} size={18} assetId={it.avatarAssetId} species={it.companion} />
            {it.owner}
          </span>
        </div>
      ))}
    </div>
  );
}
