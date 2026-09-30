import { useEffect, useState } from "react";
import { Slideshow, type Slide } from "../../components/photo/Slideshow";
import { Icon } from "../../components/ui/Icon";
import { getPhotoYears, getYearPhotos } from "../couple/api";

/**
 * « Notre année »: one tap plays every photo of a year (albums and posts),
 * oldest first. Hidden until there is at least one photo.
 */
export function OurYear() {
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    getPhotoYears()
      .then((ys) => {
        setYears(ys);
        setYear(ys[0] ?? null);
      })
      .catch(() => {});
  }, []);

  async function play() {
    if (year === null) return;
    setLoading(true);
    setError(false);
    try {
      const found = await getYearPhotos(year);
      const withPhoto = found.filter((m) => m.assetId != null);
      if (withPhoto.length > 0) {
        setSlides(withPhoto.map((m) => ({ assetId: m.assetId as number, caption: m.text, date: m.createdAt })));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (year === null) return null;

  return (
    <section className="card flex flex-wrap items-center gap-3 p-4 animate-fade-up">
      <span className="text-3xl" aria-hidden="true">
        🎞️
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Notre année</p>
        <p className="text-sm text-text-muted">{error ? "Le diaporama n'a pas pu se charger." : "Toutes nos photos de l'année, en diaporama."}</p>
      </div>
      <div className="flex items-center gap-2">
        {years.length > 1 && (
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Année"
            className="rounded-token-sm border border-border bg-surface px-2 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}
        <button type="button" onClick={play} disabled={loading} className="flex items-center gap-1.5 rounded-full btn-brand px-4 py-2 text-sm font-semibold press disabled:opacity-60">
          <Icon name="play" size={16} />
          {loading ? "…" : years.length > 1 ? "Lancer" : year}
        </button>
      </div>
      {slides && <Slideshow title={`Notre année ${year}`} slides={slides} onClose={() => setSlides(null)} />}
    </section>
  );
}
