import { SPECIES, type Species } from "../../../app/companion";
import { livingKindOf, LivingCompanion } from "../../../components/companions/LivingCompanion";
import { Animal } from "../../../components/ui/animals";
import { HeartMark, SparkleMarks } from "../../../components/ui/decor";
import { SCENES } from "./scenes";

function isSpecies(variant: string): variant is Species {
  return (SPECIES as readonly string[]).includes(variant);
}

function Decor({ variant }: { variant: string }) {
  return variant === "heart" ? <HeartMark size={64} /> : <SparkleMarks size={64} />;
}

// Animated decorative SVG: a beating heart, twinkling stars, a little scene, or a chibi animal.
export function SvgWidget({ variant, label }: { variant: string; label?: string }) {
  const Scene = SCENES[variant];
  const living = livingKindOf(variant);
  return (
    <div className="flex flex-col items-center gap-1 rounded-token border border-border bg-surface px-4 py-4">
      {Scene ? (
        <Scene />
      ) : living ? (
        <LivingCompanion kind={living} scene="tile" />
      ) : isSpecies(variant) ? (
        <div className="mc-float">
          <Animal species={variant} size={72} />
        </div>
      ) : (
        <Decor variant={variant} />
      )}
      {label && <span className="text-sm text-text-muted">{label}</span>}
    </div>
  );
}
