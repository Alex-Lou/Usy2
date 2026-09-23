import { useState } from "react";
import { Avatar } from "../../components/ui/Avatar";
import type { Profile } from "../profile/types";
import { MoodPicker } from "./MoodPicker";
import type { Mood } from "./types";
import { ago } from "./time";

/**
 * Both people's live mood, side by side. Mine is a button that opens the
 * picker; the other one is read-only.
 */
export function MoodChips({
  people,
  moods,
  myId,
  onSaved,
}: {
  people: Profile[];
  moods: Mood[];
  myId: number | undefined;
  onSaved: (mood: Mood) => void;
}) {
  const [picking, setPicking] = useState(false);
  const mine = moods.find((m) => m.userId === myId);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {people.map((p) => {
          const mood = moods.find((m) => m.userId === p.userId);
          const isMe = p.userId === myId;
          const content = (
            <>
              <Avatar name={p.displayName} size={28} assetId={p.avatarAssetId} species={p.companion} />
              <span className="text-2xl leading-none">{mood?.emoji ?? (isMe ? "＋" : "…")}</span>
              <span className="flex min-w-0 flex-col text-left leading-tight">
                <span className="truncate text-sm text-text">
                  {p.displayName}
                  {mood?.label && <span className="text-text-muted"> · {mood.label}</span>}
                </span>
                <span className="text-[11px] text-text-muted">{mood ? ago(mood.updatedAt) : isMe ? "Ton humeur ?" : "pas encore"}</span>
              </span>
            </>
          );
          return isMe ? (
            <button
              key={p.userId}
              type="button"
              onClick={() => setPicking((v) => !v)}
              aria-expanded={picking}
              className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 press hover:border-primary/50"
            >
              {content}
            </button>
          ) : (
            <div key={p.userId} className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3">
              {content}
            </div>
          );
        })}
      </div>
      {picking && <MoodPicker current={mine} onSaved={onSaved} onClose={() => setPicking(false)} />}
    </div>
  );
}
