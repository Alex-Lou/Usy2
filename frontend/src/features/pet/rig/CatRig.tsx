import { HeadItems, NeckItem } from "../accessories";
import type { EyeShape, Frame, MouthShape } from "./frame";

// Moka, drawn in three views in the app's chibi style — sitting (front),
// walking (profile) and curled up asleep — each part placed from a Frame, so
// the brain can move ears, eyes, paws, legs and tail independently. All
// drawings share a 160×140 box whose ground centre is (80, 131).

const OUTLINE = "#4a3b33";
const FUR = "#fff4e6";
const FUR_FAR = "#f1e0cb"; // legs and ear on the far side, a touch darker for depth
const BELLY = "#fffaf3";
const STRIPE = "#ecc9a0";
const PINK = "#ff86b8";
const BLUSH = "#ffb0d6";
const EYE = "#3a3350";

type Pt = [number, number];

function Eye({ c, rx, ry, shape, blink, look, far }: { c: Pt; rx: number; ry: number; shape: EyeShape; blink: number; look: Pt; far?: boolean }) {
  const [x, y] = c;
  switch (shape) {
    case "happy":
      return <path d={`M${x - 6} ${y + 2} q6 -7 12 0`} stroke={EYE} strokeWidth="2.8" fill="none" strokeLinecap="round" />;
    case "closed":
      return <path d={`M${x - 6} ${y} q6 4.5 12 0`} stroke={EYE} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
    case "squeeze":
      return (
        <path
          d={far ? `M${x - 5} ${y - 4} l8 4 l-8 4` : `M${x + 5} ${y - 4} l-8 4 l8 4`}
          stroke={EYE}
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "wide":
      return (
        <g>
          <circle cx={x} cy={y} r={rx + 2} fill="#fff" stroke={EYE} strokeWidth="2" />
          <circle cx={x + look[0] * 1.5} cy={y + look[1] * 1.2} r="2.6" fill={EYE} />
        </g>
      );
    default: {
      // Round eyes; a blink squashes them vertically around their centre.
      const open = Math.max(0.06, 1 - blink);
      const px = look[0] * 2.4;
      const py = look[1] * 2;
      return (
        <g transform={`translate(${x} ${y}) scale(1 ${open}) translate(${-x} ${-y})`}>
          <ellipse cx={x + px * 0.5} cy={y + py * 0.5} rx={rx} ry={ry} fill={EYE} />
          <circle cx={x + 1.8 + px} cy={y - 2.4 + py} r={rx * 0.37} fill="#fff" />
          <circle cx={x - 1.6 + px} cy={y + 2.4 + py} r={rx * 0.17} fill="#fff" opacity="0.8" />
        </g>
      );
    }
  }
}

/** Mouth drawn around the nose tip at (0, 0). */
function Mouth({ shape, t }: { shape: MouthShape; t: number }) {
  switch (shape) {
    case "open":
      return (
        <g>
          <path d="M-3.6 1.2 q3.6 7.5 7.2 0 z" fill="#d9577f" stroke={OUTLINE} strokeWidth="1.5" strokeLinejoin="round" />
          <ellipse cx="0" cy="4.6" rx="2" ry="1.2" fill={PINK} />
        </g>
      );
    case "yawn":
      return <ellipse cx="0" cy="5" rx="4.4" ry="5.6" fill="#d9577f" stroke={OUTLINE} strokeWidth="1.5" />;
    case "munch": {
      const open = 1 + Math.sin(t * 16) * 0.8;
      return <ellipse cx="0" cy="3" rx="3" ry={Math.max(0.6, 1.6 * open)} fill="#d9577f" stroke={OUTLINE} strokeWidth="1.2" />;
    }
    case "wavy":
      return <path d="M-5 3 q2.5 -2 5 0 q2.5 2 5 0" stroke={OUTLINE} strokeWidth="1.7" fill="none" strokeLinecap="round" />;
    case "tongue":
      return (
        <g>
          <path d="M0 0 q-3 3.4 -6.4 1.4 M0 0 q3 3.4 6.4 1.4" stroke={OUTLINE} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <ellipse cx="0" cy={3.4 + Math.sin(t * 12) * 0.8} rx="2.2" ry="2.6" fill={PINK} stroke={OUTLINE} strokeWidth="1" />
        </g>
      );
    default:
      return <path d="M0 0 q-3 3.4 -6.4 1.4 M0 0 q3 3.4 6.4 1.4" stroke={OUTLINE} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
  }
}

/** A two-tone tube (outline under fur), used for the tail and the legs. */
function Tube({ d, width, puff = 0, color = FUR }: { d: string; width: number; puff?: number; color?: string }) {
  const w = width * (1 + puff * 0.7);
  return (
    <>
      <path d={d} stroke={OUTLINE} strokeWidth={w + 4.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

const breathe = (f: Frame, amount: number) => Math.sin(f.breath) * amount * f.breathDepth;

// ——— Sitting, facing us ———
function SitView({ f, wearing }: { f: Frame; wearing: string[] }) {
  const b = breathe(f, 0.022);
  // The right front paw: on the ground, or raised to the mouth (then drawn over the face).
  const paw = (
    <g transform={`translate(${-9 * f.paw} ${-45 * f.paw}) rotate(${-25 * f.paw} 93 127)`}>
      <ellipse cx="93" cy="127" rx="9" ry="5.4" fill={FUR} stroke={OUTLINE} strokeWidth="2.2" />
    </g>
  );
  return (
    <g>
      <g transform={`rotate(${f.tail} 104 116)`}>
        <Tube d="M104 116 C 132 116, 142 94, 130 76" width={8.4} puff={f.tailPuff} />
        <path d="M133 86 q-6 -2 -9 -8" stroke={STRIPE} strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <g transform={`translate(80 129) scale(${1 - b * 0.5} ${1 + b}) translate(-80 -129)`}>
        <ellipse cx="80" cy="104" rx="31" ry="25" fill={FUR} stroke={OUTLINE} strokeWidth="2.6" />
        <ellipse cx="80" cy="109" rx="17" ry="15" fill={BELLY} />
        <path d="M53 100 q5 -3 9 1 M55 108 q5 -3 8 1" stroke={STRIPE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        {wearing.map((id) => (
          <NeckItem key={id} id={id} />
        ))}
      </g>
      <ellipse cx="67" cy="127" rx="9" ry="5.4" fill={FUR} stroke={OUTLINE} strokeWidth="2.2" />
      {f.paw < 0.5 && paw}
      <g transform={`translate(${f.headX} ${f.headY - b * 40}) rotate(${f.headTilt} 80 88)`}>
        <g transform={`rotate(${-f.earL} 60 42)`}>
          <path d="M52 46 L45 15 L73 34 Z" fill={FUR} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M54 40 L50 22 L67 33 Z" fill={PINK} />
        </g>
        <g transform={`rotate(${f.earR} 100 42)`}>
          <path d="M108 46 L115 15 L87 34 Z" fill={FUR} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M106 40 L110 22 L93 33 Z" fill={PINK} />
        </g>
        <ellipse cx="80" cy="60" rx="35" ry="30" fill={FUR} stroke={OUTLINE} strokeWidth="2.6" />
        <path d="M74 33 q1.5 5 0 9 M80 31.5 v10 M86 33 q-1.5 5 0 9" stroke={STRIPE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <Eye c={[67, 62]} rx={5.2} ry={5.8} shape={f.eyes} blink={f.blink} look={[f.lookX, f.lookY]} far />
        <Eye c={[93, 62]} rx={5.2} ry={5.8} shape={f.eyes} blink={f.blink} look={[f.lookX, f.lookY]} />
        <ellipse cx="57" cy="72" rx="5.4" ry="3.2" fill={BLUSH} opacity={f.blush} />
        <ellipse cx="103" cy="72" rx="5.4" ry="3.2" fill={BLUSH} opacity={f.blush} />
        <path d="M77 70 L83 70 L80 73.6 Z" fill={PINK} />
        <g transform="translate(80 73.6)">
          <Mouth shape={f.mouth} t={f.time} />
        </g>
        <g stroke={OUTLINE} strokeWidth="1.4" strokeLinecap="round">
          <path d="M50 67 L33 64 M50 72 L34 75" />
          <path d="M110 67 L127 64 M110 72 L126 75" />
        </g>
        <HeadItems wearing={wearing} />
      </g>
      {f.paw >= 0.5 && paw}
    </g>
  );
}

// ——— Profile (walking, eating, stalking), facing right ———
const LEGS: { hip: number; phase: number; far: boolean }[] = [
  { hip: 52, phase: Math.PI, far: true },
  { hip: 98, phase: 0, far: true },
  { hip: 62, phase: 0, far: false },
  { hip: 108, phase: Math.PI, far: false },
];

function Leg({ hip, phase, far, f, lower }: { hip: number; phase: number; far: boolean; f: Frame; lower: number }) {
  const hipY = 104 + lower;
  const length = 131 - hipY;
  const a = Math.sin(f.walk + phase) * 0.46 * f.stride;
  const lift = Math.max(0, Math.cos(f.walk + phase)) * 5 * f.stride;
  const fx = hip + Math.sin(a) * length;
  const fy = hipY + Math.cos(a) * length - lift;
  return (
    <g>
      <Tube d={`M${hip} ${hipY} L${fx} ${fy - 3}`} width={9} color={far ? FUR_FAR : FUR} />
      <ellipse cx={fx + 1.5} cy={fy - 1.2} rx="6.4" ry="3.8" fill={far ? FUR_FAR : FUR} stroke={OUTLINE} strokeWidth="2" />
    </g>
  );
}

function SideView({ f, wearing }: { f: Frame; wearing: string[] }) {
  const lower = 9 * f.crouch;
  const b = breathe(f, 0.02);
  return (
    <g>
      {/* Far legs first, then near ones; the body then covers the tops, as if they came out of it. */}
      {[...LEGS.filter((l) => l.far), ...LEGS.filter((l) => !l.far)].map((l) => (
        <Leg key={l.hip} {...l} f={f} lower={lower} />
      ))}
      <g transform={`translate(0 ${lower}) rotate(${f.lean} 78 112)`}>
        <g transform={`rotate(${f.tail} 46 96)`}>
          <Tube d="M46 96 C 28 94, 18 78, 24 58" width={8.4} puff={f.tailPuff} />
          <path d="M22 70 q6 -1 9 -6" stroke={STRIPE} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
        <g transform={`translate(78 118) scale(${1 - b * 0.4} ${1 + b}) translate(-78 -118)`}>
          <ellipse cx="78" cy="98" rx="37" ry="21" fill={FUR} stroke={OUTLINE} strokeWidth="2.6" />
          <ellipse cx="84" cy="109" rx="21" ry="8" fill={BELLY} />
          <path d="M60 80 q3 5 0 9 M70 78 q3 5 0 9 M80 78 q3 5 0 9" stroke={STRIPE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
      </g>
      <g transform={`translate(${f.headX} ${f.headY + lower}) rotate(${f.headTilt} 104 86)`}>
        <g transform="translate(100 88) scale(0.62) translate(-80 -89)">
          {wearing.map((id) => (
            <NeckItem key={id} id={id} />
          ))}
        </g>
        <g transform={`rotate(${-f.earL} 100 44)`}>
          <path d="M92 48 L90 18 L113 38 Z" fill={FUR_FAR} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M94 42 L93 25 L107 37 Z" fill={PINK} opacity="0.85" />
        </g>
        <ellipse cx="112" cy="64" rx="31" ry="27" fill={FUR} stroke={OUTLINE} strokeWidth="2.6" />
        <g transform={`rotate(${f.earR} 130 42)`}>
          <path d="M119 42 L134 13 L143 45 Z" fill={FUR} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M123 40 L133 22 L138 41 Z" fill={PINK} />
        </g>
        <path d="M106 39 q1 4 0 8 M112 38 v9" stroke={STRIPE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <Eye c={[101, 62]} rx={4.4} ry={5.2} shape={f.eyes} blink={f.blink} look={[f.lookX + 0.4, f.lookY]} far />
        <Eye c={[123, 62]} rx={5.2} ry={5.8} shape={f.eyes} blink={f.blink} look={[f.lookX + 0.4, f.lookY]} />
        <ellipse cx="95" cy="73" rx="4.2" ry="2.6" fill={BLUSH} opacity={f.blush} />
        <ellipse cx="129" cy="73" rx="4.6" ry="2.8" fill={BLUSH} opacity={f.blush} />
        <path d="M131 69 L137 69 L134 72.4 Z" fill={PINK} />
        <g transform="translate(134 72.4) scale(0.9)">
          <Mouth shape={f.mouth} t={f.time} />
        </g>
        <path d="M139 67 L155 63 M139 72 L154 75" stroke={OUTLINE} strokeWidth="1.4" strokeLinecap="round" />
        <g transform="translate(32 2)">
          <HeadItems wearing={wearing} />
        </g>
      </g>
    </g>
  );
}

// ——— Curled up, asleep ———
function CurlView({ f, wearing }: { f: Frame; wearing: string[] }) {
  const b = breathe(f, 0.035);
  return (
    <g>
      <g transform={`translate(88 131) scale(${1 + b * 0.3} ${1 + b}) translate(-88 -131)`}>
        <ellipse cx="88" cy="110" rx="44" ry="22" fill={FUR} stroke={OUTLINE} strokeWidth="2.6" />
        <path d="M84 90 q3 5 0 9 M96 90 q3 5 0 9 M108 93 q3 4 0 8" stroke={STRIPE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
      <g transform={`rotate(${f.tail * 0.3} 128 116)`}>
        <Tube d="M128 114 C 140 132, 98 138, 60 130" width={8.4} puff={f.tailPuff} />
        <path d="M76 133 q-4 -4 -3 -8" stroke={STRIPE} strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <ellipse cx="74" cy="124" rx="10" ry="5.4" fill={FUR} stroke={OUTLINE} strokeWidth="2.2" />
      <g transform={`translate(${f.headX} ${f.headY - b * 12}) rotate(${f.headTilt} 56 118)`}>
        <g transform={`rotate(${-f.earL} 42 90)`}>
          <path d="M36 92 L26 66 L52 80 Z" fill={FUR} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M37 86 L31 71 L47 80 Z" fill={PINK} />
        </g>
        <g transform={`rotate(${f.earR} 70 84)`}>
          <path d="M62 82 L78 60 L80 90 Z" fill={FUR} stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M66 81 L76 67 L77 84 Z" fill={PINK} />
        </g>
        <ellipse cx="56" cy="104" rx="27" ry="23" fill={FUR} stroke={OUTLINE} strokeWidth="2.6" />
        <Eye c={[46, 105]} rx={4.6} ry={5.2} shape={f.eyes} blink={f.blink} look={[f.lookX, f.lookY]} far />
        <Eye c={[66, 105]} rx={4.6} ry={5.2} shape={f.eyes} blink={f.blink} look={[f.lookX, f.lookY]} />
        <ellipse cx="38" cy="114" rx="4.4" ry="2.6" fill={BLUSH} opacity={f.blush} />
        <ellipse cx="74" cy="114" rx="4.4" ry="2.6" fill={BLUSH} opacity={f.blush} />
        <path d="M53.5 111 L58.5 111 L56 113.8 Z" fill={PINK} />
        <g transform="translate(56 113.8) scale(0.8)">
          <Mouth shape={f.mouth} t={f.time} />
        </g>
        <g transform="translate(-24 44)">
          <HeadItems wearing={wearing} />
        </g>
      </g>
    </g>
  );
}

// ——— Little effects around the cat (never mirrored, so text stays readable) ———
export function CatProp({ f, headX, dir }: { f: Frame; headX: number; dir: number }) {
  const t = f.propTime;
  switch (f.prop) {
    case "hearts":
      return (
        <g fill={PINK}>
          {[0, 1, 2].map((i) => {
            const k = (t * 0.7 + i / 3) % 1;
            const x = headX + [34, -48, 42][i] + Math.sin((t + i) * 3) * 3;
            const y = [58, 62, 38][i] - k * 26;
            return (
              <path
                key={i}
                transform={`translate(${x} ${y}) scale(${0.35 + k * 0.3})`}
                opacity={Math.sin(k * Math.PI)}
                d="M12 21 C4 14 0 10 0 6 A6 6 0 0 1 12 3 A6 6 0 0 1 24 6 C24 10 20 14 12 21 Z"
              />
            );
          })}
        </g>
      );
    case "zzz":
      return (
        <g fill={EYE} fontFamily="ui-rounded, system-ui, sans-serif" fontWeight="700">
          {["z", "z", "Z"].map((z, i) => {
            const k = (t * 0.33 + i / 3) % 1;
            return (
              <text key={i} x={headX + 24 + k * 14} y={78 - k * 34} fontSize={11 + k * 9} opacity={Math.sin(k * Math.PI)}>
                {z}
              </text>
            );
          })}
        </g>
      );
    case "bubbles":
      return (
        <g fill="#dff4ff" stroke="#7cc6e8" strokeWidth="1.4">
          {[[44, 40, 7], [118, 34, 6], [36, 86, 8], [124, 92, 7], [60, 20, 5], [100, 16, 6], [80, 98, 9], [56, 112, 6], [106, 114, 7]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y - Math.sin(t * 2.4 + i) * 4} r={r * (1 + Math.sin(t * 3 + i * 1.7) * 0.12)} opacity="0.92" />
          ))}
        </g>
      );
    case "alert": {
      const pop = Math.min(1, t * 6);
      return (
        <g transform={`translate(${headX + 40} 22) scale(${pop})`} fill="#f5b83d" stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round">
          <path d="M-3.5 -12 l7 0 l-2 20 l-3 0 z" />
          <circle cx="0" cy="14" r="3" />
        </g>
      );
    }
    case "note": {
      const k = Math.min(1, t * 1.4);
      return (
        <text x={headX + 30 + k * 8} y={40 - k * 14} fontSize="16" fill={PINK} opacity={1 - k * 0.8} fontWeight="700">
          ♪
        </text>
      );
    }
    case "bowl":
      return (
        <g transform={`translate(${headX + (f.view === "side" ? 20 * dir : 0)} 0)`}>
          <path d="M-22 124 h44 l-5 12 h-34 z" fill="#7cc6e8" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
          {t < 3 && (
            <g fill="#c07a3e" stroke={OUTLINE} strokeWidth="1">
              {[-10, -2, 6, 12].slice(0, Math.max(1, 4 - Math.floor(t * 1.3))).map((x) => (
                <circle key={x} cx={x} cy={121.5} r="3" />
              ))}
            </g>
          )}
        </g>
      );
    case "ball": {
      const bounce = Math.abs(Math.sin(t * 5)) * 22;
      return (
        <g transform={`translate(${headX + 34 * dir} ${116 - bounce}) rotate(${t * 240})`}>
          <circle r="10" fill={PINK} stroke={OUTLINE} strokeWidth="2" />
          <path d="M-8 -5 q8 4 16 0 M-9 2 q9 5 18 0" stroke="#fff" strokeWidth="1.4" fill="none" opacity="0.8" />
        </g>
      );
    }
    default:
      return null;
  }
}

/**
 * The cat for one frame, at scene position (f.x, ground + f.lift), `scale`
 * times the drawing size. Decorative: callers label the interactive element.
 */
export function CatRig({ f, wearing, ground, scale = 1 }: { f: Frame; wearing: string[]; ground: number; scale?: number }) {
  const dir = f.facing < 0 ? -1 : 1;
  const turn = Math.max(0.15, Math.abs(f.facing)); // squeezes through the middle when turning around
  const jitter = f.shake ? Math.sin(f.time * 90) * 0.6 * f.shake : 0;
  const shadow = Math.max(0.35, 1 + f.lift / 90);
  const headX = f.view === "sit" ? 80 : f.view === "side" ? 80 + 32 * dir : 80 - 24 * dir;
  return (
    <g transform={`translate(${f.x} ${ground}) scale(${scale})`}>
      <ellipse cx="0" cy="0" rx={f.view === "sit" ? 40 : 48} ry="5" fill="#000" opacity={0.16 * shadow} transform={`scale(${shadow} 1)`} />
      <g transform={`translate(${jitter} ${f.lift}) scale(${dir * turn * f.sx} ${f.sy}) translate(-80 -131)`}>
        {f.view === "sit" ? <SitView f={f} wearing={wearing} /> : f.view === "side" ? <SideView f={f} wearing={wearing} /> : <CurlView f={f} wearing={wearing} />}
      </g>
      <g transform={`translate(0 ${f.lift}) translate(-80 -131)`}>
        <CatProp f={f} headX={headX} dir={dir} />
      </g>
    </g>
  );
}
