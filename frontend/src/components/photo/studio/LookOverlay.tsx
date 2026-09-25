import { GRAIN_PER_WIDTH, grainDataUrl, grainOpacity, vignetteCss, type Finish, type Tint } from "./looks";

/**
 * The look's layers over the photo preview, as CSS blend modes (the export
 * paints the same layers, see paintFinish). The parent must isolate its
 * stacking context so the blends only touch the photo.
 */
export function LookOverlay({ tints, finish, width }: { tints: Tint[]; finish: Finish; width: number }) {
  return (
    <>
      {tints.map((t, i) => (
        <div key={i} className="pointer-events-none absolute inset-0" style={{ background: t.color, mixBlendMode: t.blend, opacity: t.opacity }} />
      ))}
      {finish.vignette > 0 && <div className="pointer-events-none absolute inset-0" style={{ background: vignetteCss(finish) }} />}
      {finish.grain > 0 && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url(${grainDataUrl()})`,
            backgroundSize: `${width / GRAIN_PER_WIDTH}px`,
            mixBlendMode: "overlay",
            opacity: grainOpacity(finish),
          }}
        />
      )}
    </>
  );
}
