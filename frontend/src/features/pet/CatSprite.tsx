// The couple's cat, full body, hand-drawn in the same chibi style as the
// companion faces (see components/ui/animals.tsx). Each pose only swaps a few
// parts (eyes, mouth, props); all motion is CSS (styles/pet.css), so it stays
// light and stops entirely for people who prefer reduced motion.

export type CatPose = "idle" | "sleep" | "purr" | "eat" | "play" | "startle" | "hungry";

const OUTLINE = "#4a3b33";
const FUR = "#fff4e6";
const BELLY = "#fffaf3";
const STRIPE = "#ecc9a0";
const PINK = "#ff86b8";
const BLUSH = "#ffb0d6";
const EYE = "#3a3350";

function Eyes({ pose }: { pose: CatPose }) {
  switch (pose) {
    case "sleep":
      return (
        <g stroke={EYE} strokeWidth="2.6" fill="none" strokeLinecap="round">
          <path d="M61 62 q6 4.5 12 0" />
          <path d="M87 62 q6 4.5 12 0" />
        </g>
      );
    case "purr":
    case "eat":
      return (
        <g stroke={EYE} strokeWidth="2.8" fill="none" strokeLinecap="round">
          <path d="M61 64 q6 -7 12 0" />
          <path d="M87 64 q6 -7 12 0" />
        </g>
      );
    case "startle":
      return (
        <g>
          <circle cx="67" cy="61" r="7" fill="#fff" stroke={EYE} strokeWidth="2" />
          <circle cx="93" cy="61" r="7" fill="#fff" stroke={EYE} strokeWidth="2" />
          <circle cx="67" cy="61" r="2.6" fill={EYE} />
          <circle cx="93" cy="61" r="2.6" fill={EYE} />
        </g>
      );
    default:
      return (
        <g className="pet-eyes">
          <ellipse cx="67" cy="62" rx="5.2" ry="5.8" fill={EYE} />
          <ellipse cx="93" cy="62" rx="5.2" ry="5.8" fill={EYE} />
          <circle cx="69" cy="59.6" r="1.9" fill="#fff" />
          <circle cx="95" cy="59.6" r="1.9" fill="#fff" />
          <circle cx="65.4" cy="64.4" r="0.9" fill="#fff" opacity="0.8" />
          <circle cx="91.4" cy="64.4" r="0.9" fill="#fff" opacity="0.8" />
          {pose === "hungry" && (
            <g stroke={OUTLINE} strokeWidth="2" strokeLinecap="round">
              <path d="M59 55 l10 -4" />
              <path d="M101 55 l-10 -4" />
            </g>
          )}
        </g>
      );
  }
}

function Mouth({ pose }: { pose: CatPose }) {
  if (pose === "startle") return <ellipse cx="80" cy="76.5" rx="2.6" ry="3" fill={OUTLINE} />;
  if (pose === "eat") return <ellipse cx="80" cy="76" rx="3.2" ry="2.4" fill="#d9577f" stroke={OUTLINE} strokeWidth="1.2" />;
  if (pose === "hungry") return <path d="M75.5 77 q4.5 -2.6 9 0" stroke={OUTLINE} strokeWidth="1.7" fill="none" strokeLinecap="round" />;
  return <path d="M80 73.6 q-3 3.4 -6.4 1.4 M80 73.6 q3 3.4 6.4 1.4" stroke={OUTLINE} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
}

function Props({ pose }: { pose: CatPose }) {
  switch (pose) {
    case "sleep":
      return (
        <g className="pet-zzz" fill={EYE} fontFamily="ui-rounded, system-ui, sans-serif" fontWeight="700">
          <text x="112" y="36" fontSize="13">z</text>
          <text x="122" y="24" fontSize="16">z</text>
          <text x="134" y="10" fontSize="19">Z</text>
        </g>
      );
    case "purr":
      return (
        <g fill={PINK}>
          {/* Outer group places each heart; the inner path carries the CSS motion
              (a CSS transform would otherwise replace the SVG placement). */}
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${[114, 30, 124][i]} ${[58, 62, 38][i]}) scale(0.55)`}>
              <path
                className="pet-heart"
                style={{ animationDelay: `${i * 0.45}s` }}
                d="M12 21 C4 14 0 10 0 6 A6 6 0 0 1 12 3 A6 6 0 0 1 24 6 C24 10 20 14 12 21 Z"
              />
            </g>
          ))}
        </g>
      );
    case "eat":
    case "hungry":
      // Eating: the bowl right under the nose. Hungry: the empty bowl waits aside.
      return (
        <g transform={pose === "eat" ? "translate(0 2)" : "translate(-46 2)"}>
          <path d="M58 124 h44 l-5 12 h-34 z" fill="#7cc6e8" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
          {pose === "eat" && (
            <g className="pet-kibble" fill="#c07a3e" stroke={OUTLINE} strokeWidth="1">
              <circle cx="70" cy="122" r="3" />
              <circle cx="78" cy="120.5" r="3" />
              <circle cx="86" cy="122" r="3" />
              <circle cx="92" cy="121" r="2.6" />
            </g>
          )}
        </g>
      );
    case "play":
      return (
        <g className="pet-ball">
          <circle cx="134" cy="116" r="10" fill={PINK} stroke={OUTLINE} strokeWidth="2" />
          <path d="M126 111 q8 4 16 0 M125 118 q9 5 18 0 M130 107 q-2 9 2 18" stroke="#fff" strokeWidth="1.4" fill="none" opacity="0.8" />
          <path d="M144 118 q8 4 4 12 q-3 5 4 8" stroke={PINK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      );
    case "startle":
      return (
        <g fill="#f5b83d" stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round">
          <path d="M118 12 l7 0 l-2 20 l-3 0 z" />
          <circle cx="121.5" cy="38" r="3" />
        </g>
      );
    default:
      return null;
  }
}

/** The cat in a given pose. Decorative: the caller provides the accessible label. */
export function CatSprite({ pose, size = 120 }: { pose: CatPose; size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.875}
      viewBox="0 0 160 140"
      className={`pet pet--${pose}`}
      aria-hidden="true"
      overflow="visible"
    >
      <ellipse cx="80" cy="131" rx="40" ry="5" fill="#000" opacity="0.16" className="pet-shadow" />
      <g className="pet-all">
        {/* Tail: a two-tone tube (outline under fur) swaying from its base. */}
        <g className="pet-tail">
          <path d="M104 116 C 132 116, 142 94, 130 76" stroke={OUTLINE} strokeWidth="13" fill="none" strokeLinecap="round" />
          <path d="M104 116 C 132 116, 142 94, 130 76" stroke={FUR} strokeWidth="8.4" fill="none" strokeLinecap="round" />
          <path d="M133 86 q-6 -2 -9 -8" stroke={STRIPE} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>

        <g className="pet-body">
          <ellipse cx="80" cy="104" rx="31" ry="25" fill={FUR} stroke={OUTLINE} strokeWidth="2.6" />
          <ellipse cx="80" cy="109" rx="17" ry="15" fill={BELLY} />
          <path d="M53 100 q5 -3 9 1 M55 108 q5 -3 8 1" stroke={STRIPE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>

        <ellipse cx="67" cy="127" rx="9" ry="5.4" fill={FUR} stroke={OUTLINE} strokeWidth="2.2" />
        <g className="pet-paw-r">
          <ellipse cx="93" cy="127" rx="9" ry="5.4" fill={FUR} stroke={OUTLINE} strokeWidth="2.2" />
        </g>

        <g className="pet-head">
          <g className="pet-ear-l">
            <path d="M52 46 L45 15 L73 34 Z" fill={FUR} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M54 40 L50 22 L67 33 Z" fill={PINK} />
          </g>
          <g className="pet-ear-r">
            <path d="M108 46 L115 15 L87 34 Z" fill={FUR} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M106 40 L110 22 L93 33 Z" fill={PINK} />
          </g>
          <ellipse cx="80" cy="60" rx="35" ry="30" fill={FUR} stroke={OUTLINE} strokeWidth="2.6" />
          <path d="M74 33 q1.5 5 0 9 M80 31.5 v10 M86 33 q-1.5 5 0 9" stroke={STRIPE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <Eyes pose={pose} />
          <ellipse cx="57" cy="72" rx="5.4" ry="3.2" fill={BLUSH} opacity="0.75" />
          <ellipse cx="103" cy="72" rx="5.4" ry="3.2" fill={BLUSH} opacity="0.75" />
          <path d="M77 70 L83 70 L80 73.6 Z" fill={PINK} />
          <Mouth pose={pose} />
          <g stroke={OUTLINE} strokeWidth="1.4" strokeLinecap="round" className="pet-whiskers">
            <path d="M50 67 L33 64 M50 72 L34 75" />
            <path d="M110 67 L127 64 M110 72 L126 75" />
          </g>
        </g>
      </g>
      <Props pose={pose} />
    </svg>
  );
}
