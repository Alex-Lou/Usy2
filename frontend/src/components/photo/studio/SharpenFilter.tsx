import { SIGMA_OF_WIDTH } from "./sharpen";

/**
 * The preview side of sharpen.ts: the same unsharp mask as an SVG filter
 * (GPU, instant), referenced by the preview canvas as `url(#id)`. Maths in
 * sRGB like the export: out = (1 + amount) × in − amount × blur.
 */
export function SharpenFilter({ id, amount, width }: { id: string; amount: number; width: number }) {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <filter id={id} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
        <feGaussianBlur in="SourceGraphic" stdDeviation={SIGMA_OF_WIDTH * width} result="soft" />
        {/* The blur mixes in the transparent outside at the borders (edgeMode is not honoured everywhere):
            feColorMatrix works on un-premultiplied colours, so forcing alpha to 1 keeps only the photo's colours. */}
        <feColorMatrix in="soft" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="arithmetic" k1="0" k2={1 + amount} k3={-amount} k4="0" />
      </filter>
    </svg>
  );
}
