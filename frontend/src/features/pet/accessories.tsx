// Moka's accessories, drawn once for both drawings of the cat (CatSprite and
// rig/CatRig), in the sitting view's coordinates: neck around (80, 89), head
// centre (80, 60), eyes at (67, 62) and (93, 62). Ids match PetCatalog.java.

const OUTLINE = "#4a3b33";

/** Neck slot (one worn at a time; the server enforces it). */
export function NeckItem({ id }: { id: string }) {
  if (id === "collar")
    return (
      <g>
        <path d="M57 84 q23 11 46 0" stroke="#d94a6a" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="80" cy="92" r="4" fill="#f2c14e" stroke={OUTLINE} strokeWidth="1.3" />
        <path d="M78 93 h4" stroke={OUTLINE} strokeWidth="1" />
      </g>
    );
  if (id === "bow")
    return (
      <g fill="#ff86b8" stroke={OUTLINE} strokeWidth="1.5" strokeLinejoin="round">
        <path d="M80 89 L66 82 L66 96 Z" />
        <path d="M80 89 L94 82 L94 96 Z" />
        <circle cx="80" cy="89" r="3.6" />
      </g>
    );
  if (id === "scarf")
    return (
      <g stroke={OUTLINE} strokeWidth="1.5" strokeLinejoin="round">
        <path d="M55 82 q25 13 50 0 l0 6 q-25 13 -50 0 z" fill="#4fb3a9" />
        <path d="M92 90 l6 20 l-9 1 l-3 -19 z" fill="#4fb3a9" />
        <path d="M60 86 q20 9 40 0" stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.6" />
      </g>
    );
  if (id === "bandana")
    return (
      <g stroke={OUTLINE} strokeWidth="1.5" strokeLinejoin="round">
        <path d="M56 83 q24 12 48 0 l-24 23 z" fill="#e0524f" />
        <g fill="#fff" stroke="none" opacity="0.85">
          <circle cx="70" cy="90" r="1.3" />
          <circle cx="80" cy="96" r="1.3" />
          <circle cx="90" cy="90" r="1.3" />
          <circle cx="80" cy="88" r="1.1" />
        </g>
      </g>
    );
  if (id === "pearls")
    return (
      <g fill="#fbf7ef" stroke={OUTLINE} strokeWidth="0.9">
        {[58, 63.5, 69, 74.5, 80, 85.5, 91, 96.5, 102].map((x) => (
          <circle key={x} cx={x} cy={84 + 9 * (1 - ((x - 80) / 23) ** 2)} r="2.6" />
        ))}
      </g>
    );
  return null;
}

/** Head and face slots. */
export function HeadItems({ wearing }: { wearing: string[] }) {
  const on = (id: string) => wearing.includes(id);
  return (
    <>
      {on("glasses") && (
        <g stroke={OUTLINE} strokeWidth="1.8" fill="rgba(255,255,255,0.18)">
          <circle cx="67" cy="62" r="9" />
          <circle cx="93" cy="62" r="9" />
          <path d="M76 61 q4 -3 8 0" fill="none" />
        </g>
      )}
      {on("sunglasses") && (
        <g stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M57 56 h19 q1 11 -9 12 q-10 -1 -10 -12 z" fill="#1f1d2b" />
          <path d="M84 56 h19 q0 11 -10 12 q-10 -1 -9 -12 z" fill="#1f1d2b" />
          <path d="M76 58 q4 -3 8 0" fill="none" />
          <path d="M61 59 l5 -1.5" stroke="#fff" strokeWidth="1.2" opacity="0.7" />
        </g>
      )}
      {on("heartglasses") && (
        <g stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round" fill="#ff5c93" fillOpacity="0.85">
          <path d="M67 70 l-9 -9 a5 5 0 0 1 9 -5 a5 5 0 0 1 9 5 z" />
          <path d="M93 70 l-9 -9 a5 5 0 0 1 9 -5 a5 5 0 0 1 9 5 z" />
          <path d="M76 60 q4 -3 8 0" fill="none" />
        </g>
      )}
      {on("monocle") && (
        <g stroke={OUTLINE} strokeWidth="1.8">
          <circle cx="93" cy="62" r="9" fill="rgba(255,255,255,0.18)" stroke="#c99a2e" strokeWidth="2.4" />
          <path d="M101 67 q6 10 2 22" fill="none" stroke="#c99a2e" strokeWidth="1.2" />
        </g>
      )}
      {on("beret") && (
        <g stroke={OUTLINE} strokeWidth="1.8">
          <ellipse cx="84" cy="32" rx="24" ry="8.5" fill="#7a5bb5" transform="rotate(-8 84 32)" />
          <path d="M88 22 l2 -5" strokeLinecap="round" />
        </g>
      )}
      {on("crown") && (
        <path d="M64 34 L66 18 L73 27 L80 14 L87 27 L94 18 L96 34 Z" fill="#f2c14e" stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round" />
      )}
      {on("flowers") && (
        <g stroke={OUTLINE} strokeWidth="1">
          <path d="M52 38 q28 -16 56 0" stroke="#5aa06b" strokeWidth="2.4" fill="none" />
          {[
            [55, 36, "#ff86b8"],
            [66, 30, "#ffd45e"],
            [80, 27, "#b18cff"],
            [94, 30, "#ff86b8"],
            [105, 36, "#7cc6e8"],
          ].map(([x, y, c]) => (
            <g key={x as number} transform={`translate(${x} ${y})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx={3.4 * Math.cos((a * Math.PI) / 180)} cy={3.4 * Math.sin((a * Math.PI) / 180)} r="2.6" fill={c as string} />
              ))}
              <circle r="1.8" fill="#fff6c9" />
            </g>
          ))}
        </g>
      )}
      {on("party") && (
        <g stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M84 34 L97 2 L110 30 Z" fill="#7cc6e8" />
          <path d="M89 22 l14 3 M92 14 l9 2" stroke="#ff86b8" strokeWidth="2.6" />
          <circle cx="97" cy="2" r="4" fill="#ffd45e" />
        </g>
      )}
      {on("wizard") && (
        <g stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M60 32 Q76 20 82 -6 Q90 18 102 30 Z" fill="#5b4bb5" />
          <ellipse cx="80" cy="32" rx="28" ry="6" fill="#4a3d9a" />
          <path d="M80 12 l1.5 3 3.2 .4 -2.4 2.2 .6 3.2 -2.9 -1.6 -2.9 1.6 .6 -3.2 -2.4 -2.2 3.2 -.4 z" fill="#ffd45e" strokeWidth="0.8" />
          <circle cx="90" cy="24" r="1.4" fill="#ffd45e" stroke="none" />
        </g>
      )}
      {on("tophat") && (
        <g stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round">
          <ellipse cx="80" cy="32" rx="24" ry="5.5" fill="#26232f" />
          <path d="M67 31 V8 q13 -4 26 0 V31 z" fill="#26232f" />
          <path d="M67 25 q13 3 26 0 v-4 q-13 3 -26 0 z" fill="#d94a6a" />
        </g>
      )}
      {on("bunny") && (
        <g stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M60 36 q20 -12 40 0" stroke="#ff86b8" strokeWidth="3.2" fill="none" />
          <path d="M72 30 q-8 -26 -1 -30 q7 4 5 29 z" fill="#fff" />
          <path d="M72 26 q-4 -18 -0.5 -22 q3 4 2.5 21 z" fill="#ffc2da" stroke="none" />
          <path d="M88 29 q-2 -25 5 -29 q7 4 -1 30 z" fill="#fff" />
          <path d="M89.5 25 q-1 -17 3 -21 q3.5 4 -0.5 22 z" fill="#ffc2da" stroke="none" />
        </g>
      )}
    </>
  );
}
