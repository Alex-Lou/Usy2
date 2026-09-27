import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { getScores, telepathy, type NousAgreement, type NousResetState, type NousScore, type NousScores, type NousTheme } from "./api";
import { ResetPanel } from "./NousReset";

/**
 * 📊 How well we know each other (in all: the gauges above), how often we
 * answered the same, then theme by theme (both ways),
 * how many answers each of us gave, and how often we answered the same. A
 * theme opens its comparison. Starting again is at the bottom.
 */
export function ScoresTab({ themes, partnerName, pending, onCompare, onChange }: {
  themes: NousTheme[];
  partnerName: string;
  pending: NousResetState | null;
  onCompare: (theme: string) => void;
  onChange: () => void;
}) {
  const [data, setData] = useState<NousScores | null>(null);
  const [failed, setFailed] = useState(false);
  const load = () => {
    getScores().then(setData).catch(() => setFailed(true));
  };
  useEffect(load, []);

  if (failed) return <p className="card p-4 text-sm">Les scores ne se chargent pas.</p>;
  if (!data) return <div className="card h-72 animate-pulse" />;

  return (
    <div className="flex flex-col gap-4" data-nous-scores="">
      {/* In all: the two gauges at the top of the page, and how often we answered the same. */}
      <Agreement a={data.agreement} partnerName={partnerName} />

      <section className="flex flex-col gap-2" aria-label="Par catégorie">
        <h3 className="font-display text-lg font-bold">🗂️ Par catégorie</h3>
        <ul className="flex flex-col gap-2">
          {data.themes.map((s, i) => {
            const t = themes.find((x) => x.id === s.id);
            if (!t) return null;
            const any = s.myAnswers + s.theirAnswers > 0;
            return (
              <li key={s.id} className="card qz-slide flex flex-col gap-2 p-3" style={{ borderLeft: `4px solid ${t.color}`, animationDelay: `${Math.min(i, 12) * 35}ms` }} data-nous-theme-score={s.id}>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{t.emoji} {t.label}</p>
                  {any && (
                    <button type="button" onClick={() => onCompare(s.id)} className="chip press ml-auto text-xs">🔍 Comparer</button>
                  )}
                </div>
                <Bar label={`Toi → ${partnerName}`} score={s.me} color={t.color} />
                <Bar label={`${partnerName} → toi`} score={s.them} color={t.color} />
                <p className="text-[11px] text-text-muted">
                  ✍️ Tes réponses {s.myAnswers}/{s.guessable} · les siennes {s.theirAnswers}/{s.guessable}
                  {s.agreement.compared > 0 && ` · 🤝 ${s.agreement.same}/${s.agreement.compared} pareilles`}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <ResetPanel themes={themes} partnerName={partnerName} pending={pending} onDone={() => { load(); onChange(); }} />
    </div>
  );
}

function Agreement({ a, partnerName }: { a: NousAgreement; partnerName: string }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      <span className="text-3xl" aria-hidden="true">🤝</span>
      <div className="min-w-0">
        <p className="font-display text-xl font-bold tabular-nums">{a.percent == null ? "—" : `${a.percent} %`} <span className="text-sm font-semibold text-text-muted">de réponses identiques</span></p>
        <p className="text-xs text-text-muted">
          {a.compared === 0
            ? `Devine des réponses de ${partnerName} auxquelles tu as aussi répondu pour le découvrir.`
            : `${a.same} sur les ${a.compared} réponses de ${partnerName} que tu connais déjà.`}
        </p>
      </div>
    </div>
  );
}

/** One direction of a theme: its gauge, and how many guesses it rests on. */
function Bar({ label, score, color }: { label: string; score: NousScore; color: string }) {
  const judged = score.right + score.close + score.some + score.wrong;
  return (
    <div className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2 text-xs" title={telepathy(score.percent)}>
      <span className="truncate text-text-muted">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score.percent ?? 0}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full" style={{ background: color }} />
      </div>
      <span className="text-right font-semibold tabular-nums" aria-label={`${label} : ${score.percent == null ? "pas encore" : `${score.percent} %`} sur ${judged} devinette${judged > 1 ? "s" : ""}`}>
        {score.percent == null ? "—" : `${score.percent} %`}
      </span>
    </div>
  );
}
