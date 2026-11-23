import { Fragment, useState } from "react";
import { isBare, RichBody } from "../../components/rich/RichBody";
import { LinkPreview } from "../../components/rich/LinkPreview";
import { firstUrl } from "../../components/rich/links";
import type { Asset } from "../../lib/api/assets";
import { flashElement } from "../../lib/flash";
import { AttachmentView } from "../chat/AttachmentView";
import { isImage } from "../chat/attachments";
import { LongPress, ReactionBar, ReactionPills } from "../chat/MessageReactions";
import { quoteText } from "../chat/Quote";
import { EmojiSheet } from "./EmojiSheet";
import { FIXED_REACTIONS, readReactionRecents, rememberReaction } from "./reactionEmojis";
import type { Message } from "../chat/types";

const RUN_GAP_MS = 5 * 60_000;

const dayKey = (iso: string) => new Date(iso).toDateString();
const time = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", ...(d.getFullYear() !== today.getFullYear() && { year: "numeric" }) });
}

/** Same sender, same day, a few minutes apart: one block, the tail on the last one. */
function sameRun(a: Message | undefined, b: Message | undefined): boolean {
  return !!a && !!b && !a.kind && !b.kind && a.sender.id === b.sender.id && dayKey(a.createdAt) === dayKey(b.createdAt)
    && Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < RUN_GAP_MS;
}

/** ✓ sent, ✓✓ received, ✓✓ in the accent once read. */
function Ticks({ m }: { m: Message }) {
  const state = m.readAt ? "Lu" : m.deliveredAt ? "Reçu" : "Envoyé";
  const double = state !== "Envoyé";
  return (
    <svg viewBox={double ? "0 0 22 12" : "0 0 16 12"} width={double ? 16 : 11} height={10} role="img" aria-label={state}
      className={state === "Lu" ? "msg-read" : ""} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 6.5 5 10l8.5-8.5" />
      {double && <path d="M9.5 9 10.5 10 19 1.5" />}
    </svg>
  );
}

/**
 * The conversation, sober: day separators, bubbles grouped by sender, the
 * quoted message above a reply, photos, voice notes and files, reactions.
 * A long press opens the reactions and the actions; a swipe answers. The
 * bubble styles and screen effects sent from MemoCat show as plain messages.
 */
export function Thread({ messages, myId, partnerName, onOpenImage, onReact, onReply, onEdit }: {
  messages: Message[];
  myId: number | undefined;
  partnerName: string;
  onOpenImage: (a: Asset) => void;
  onReact: (messageId: number, emoji: string | null) => void;
  onReply: (m: Message) => void;
  onEdit: (m: Message) => void;
}) {
  const [menu, setMenu] = useState<{ message: Message; anchor: DOMRect } | null>(null);
  const [more, setMore] = useState<Message | null>(null); // every emoji, for this message
  const myReaction = (m: Message) => m.reactions.find((r) => r.userId === myId)?.emoji ?? null;
  const react = (m: Message, emoji: string) => {
    const again = myReaction(m) === emoji; // the same one again takes it back
    if (!again) rememberReaction(emoji);
    onReact(m.id, again ? null : emoji);
  };

  return (
    <div className="flex flex-col">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const mine = m.sender.id === myId;
        const lastOfRun = !sameRun(m, next);
        const firstOfRun = !sameRun(prev, m);
        const text = m.content.trim();
        const bare = !!text && !m.attachment && isBare(m.content);
        const url = text && !m.attachment ? firstUrl(m.content) : null;
        const photoOnly = !text && !!m.attachment && isImage(m.attachment);
        const day = (!prev || dayKey(prev.createdAt) !== dayKey(m.createdAt)) && (
          <div className="my-3 flex justify-center">
            <span className="msg-day rounded-full px-3 py-1 text-[11px] font-semibold first-letter:uppercase">{dayLabel(m.createdAt)}</span>
          </div>
        );
        if (m.kind === "thinking") {
          // « Je pense à toi »: a little cloud in the middle, not a bubble to answer.
          return (
            <Fragment key={m.id}>
              {day}
              <div id={`msg-${m.id}`} className="my-3 flex flex-col items-center">
                <div className="msg-thought px-4 py-2 text-[14px]">
                  <span className="mr-1.5" aria-hidden="true">💭</span>
                  {mine ? <>Tu as pensé à <b>{partnerName}</b></> : <><b>{partnerName}</b> pense à toi</>}
                </div>
                <span className="msg-meta mt-1.5 text-[11px]">{time(m.createdAt)}</span>
              </div>
            </Fragment>
          );
        }
        return (
          <Fragment key={m.id}>
            {day}
            <div id={`msg-${m.id}`} className={`flex flex-col ${mine ? "msg-out items-end" : "msg-in items-start"} ${lastOfRun ? "msg-tail" : ""} ${firstOfRun ? "mt-2.5" : "mt-0.5"}`}>
              <div className={`flex max-w-[82%] flex-col ${mine ? "items-end" : "items-start"}`}>
                <LongPress onLongPress={(anchor) => setMenu({ message: m, anchor })} onSwipe={() => onReply(m)}>
                  <div className={bare ? "" : "msg-bubble" + (photoOnly ? " msg-bubble-media" : "")}>
                    {m.replyTo && (
                      <button type="button" onClick={() => flashElement(`msg-${m.replyTo!.id}`)} className="msg-quote mb-1.5 block w-full px-2 py-1 text-left text-[12.5px]">
                        <b className="block text-xs">{m.replyTo.senderId === myId ? "Toi" : partnerName}</b>
                        <span className="line-clamp-2 opacity-90">{quoteText(m.replyTo)}</span>
                      </button>
                    )}
                    {m.attachment && (
                      <div className={text ? "mb-1" : ""}>
                        <AttachmentView asset={m.attachment} mine={mine} onOpenImage={onOpenImage} />
                      </div>
                    )}
                    {text && <RichBody text={m.content} className="text-[14.5px]" />}
                    {!bare && (
                      <span className="msg-meta float-right ml-4 mt-1 inline-flex items-center gap-1 leading-none">
                        {m.editedAt && <span className="italic">modifié</span>}
                        {time(m.createdAt)}
                        {mine && <Ticks m={m} />}
                      </span>
                    )}
                  </div>
                </LongPress>
                {bare && (
                  <span className="msg-meta mt-1 inline-flex items-center gap-1 px-1">
                    {time(m.createdAt)}
                    {mine && <Ticks m={m} />}
                  </span>
                )}
                {m.reactions.length > 0 && (
                  <div className="mt-0.5 self-start px-1">
                    <ReactionPills
                      reactions={m.reactions}
                      myId={myId}
                      onOpen={() => {
                        const el = document.getElementById(`msg-${m.id}`);
                        if (el) setMenu({ message: m, anchor: el.getBoundingClientRect() });
                      }}
                    />
                  </div>
                )}
                {url && <LinkPreview url={url} className="mt-1 w-72 max-w-full" />}
              </div>
            </div>
          </Fragment>
        );
      })}
      {menu && (
        <ReactionBar
          anchor={menu.anchor}
          mine={menu.message.sender.id === myId}
          emojis={[...FIXED_REACTIONS]}
          recents={readReactionRecents()}
          onMore={() => {
            setMore(menu.message);
            setMenu(null);
          }}
          current={myReaction(menu.message)}
          copyText={menu.message.content.trim() ? menu.message.content : null}
          onReply={() => onReply(menu.message)}
          onEdit={menu.message.sender.id === myId && menu.message.content.trim() ? () => onEdit(menu.message) : undefined}
          onPick={(emoji) => {
            react(menu.message, emoji);
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}
      {more && (
        <EmojiSheet
          onPick={(emoji) => {
            react(more, emoji);
            setMore(null);
          }}
          onClose={() => setMore(null)}
        />
      )}
    </div>
  );
}
