import { Fragment } from "react";
import { isBare, RichBody } from "../../components/rich/RichBody";
import { Avatar } from "../../components/ui/Avatar";
import { ProfileLink } from "../../components/ui/ProfileLink";
import type { Asset } from "../../lib/api/assets";
import { AttachmentView } from "./AttachmentView";
import type { Message } from "./types";

const GROUP_GAP_MS = 5 * 60_000;

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(d.getFullYear() !== today.getFullYear() && { year: "numeric" }),
  });
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Same sender, same day, a few minutes apart: shown as one block. */
function sameRun(a: Message | undefined, b: Message | undefined): boolean {
  return (
    !!a && !!b && a.sender.id === b.sender.id && dayKey(a.createdAt) === dayKey(b.createdAt) &&
    Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < GROUP_GAP_MS
  );
}

/**
 * The conversation: day separators, messages grouped by sender (avatar and time
 * on the last one of a run), text bubbles, big stickers/emojis, attachments.
 */
export function MessageList({ messages, myId, onOpenImage }: { messages: Message[]; myId: number | undefined; onOpenImage: (a: Asset) => void }) {
  return (
    <div className="flex flex-col">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const mine = m.sender.id === myId;
        const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
        const lastOfRun = !sameRun(m, next);
        const firstOfRun = !sameRun(prev, m);
        const hasText = m.content.trim().length > 0;
        const bare = hasText && !m.attachment && isBare(m.content); // lone sticker / few emojis: no bubble

        return (
          <Fragment key={m.id}>
            {newDay && (
              <div className="my-3 flex justify-center">
                <span className="rounded-full bg-surface-2 px-3 py-1 text-[11px] font-semibold text-text-muted first-letter:uppercase">
                  {dayLabel(m.createdAt)}
                </span>
              </div>
            )}
            <div className={`mc-offscreen-skip flex items-end gap-2 ${mine ? "flex-row-reverse" : ""} ${firstOfRun ? "mt-3" : "mt-0.5"}`}>
              {!mine && (
                <span className="w-[30px] shrink-0">
                  {lastOfRun && (
                    <ProfileLink userId={m.sender.id} className="block rounded-full">
                      <Avatar name={m.sender.displayName} size={30} assetId={m.sender.avatarAssetId} species={m.sender.companion} />
                    </ProfileLink>
                  )}
                </span>
              )}
              <div className={`flex max-w-[80%] flex-col gap-1 animate-pop ${mine ? "items-end" : "items-start"}`}>
                {m.attachment && <AttachmentView asset={m.attachment} mine={mine} onOpenImage={onOpenImage} />}
                {hasText && (
                  <div
                    className={
                      bare
                        ? ""
                        : "break-words rounded-token px-3.5 py-2 " +
                          (mine
                            ? `btn-brand ${lastOfRun ? "rounded-br-sm" : ""}`
                            : `border border-border bg-surface-2 ${lastOfRun ? "rounded-bl-sm" : ""}`)
                    }
                  >
                    <RichBody text={m.content} />
                  </div>
                )}
                {lastOfRun && <span className="px-1 text-[10px] text-text-muted">{time(m.createdAt)}</span>}
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
