import { telepathy, type NousScore } from "./api";

/** A telepathy gauge: how many guesses were right (close counts half). */
export function Gauge({ title, score }: { title: string; score: NousScore }) {
  const p = score.percent ?? 0;
  const judged = score.right + score.close + score.some + score.wrong;
  return (
    <div className="card flex flex-col gap-1.5 p-3" aria-label={`${title} : ${score.percent == null ? "pas encore de verdict" : `${p} %`}`}>
      <p className="truncate text-xs font-semibold text-text-muted">{title}</p>
      <p className="font-display text-2xl font-bold tabular-nums">{score.percent == null ? "—" : `${p} %`}</p>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="nd-gauge h-full rounded-full" style={{ width: `${p}%` }} />
      </div>
      <p className="text-[11px] leading-tight text-text-muted">
        {telepathy(score.percent)}
        {judged > 0 && ` · ${score.right}🎯 ${score.close}😏${score.some ? ` ${score.some}🤏` : ""} ${score.wrong}🙈`}
        {score.pending > 0 && ` · ${score.pending}⏳`}
      </p>
    </div>
  );
}
