#!/usr/bin/env node
// Guards the design tokens (src/styles/tokens.css): a colour is written as a
// value there, and nowhere else. Components use the roles and zone tokens
// (var(--color-surface), var(--nous-accent)…) or the Tailwind classes built on
// them. Fails with the file, line and colour of each raw one found.
//
//   npm run check:tokens
//
// Only files that are drawings or palettes may keep their colours, each listed
// below with why. Anything else goes through a token.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const src = join(root, "src");

/** Where raw colours belong, and why. */
const ALLOWED = {
  // The values themselves.
  "styles/tokens.css": "les tokens",

  // Illustrations: SVG drawings whose colours are the artwork.
  "components/ui/animals.tsx": "illustration",
  "components/companions/bodies.tsx": "illustration",
  "components/companions/LivingCompanion.tsx": "illustration",
  "components/rich/stickers.tsx": "illustration",
  "features/pet/accessories.tsx": "illustration",
  "features/pet/coat.ts": "illustration (pelages)",
  "features/pet/CatSprite.tsx": "illustration",
  "features/pet/rig/CatRig.tsx": "illustration",
  "features/pet/rig/LivingCat.tsx": "illustration",
  "features/pet/house/Room.tsx": "illustration",
  "features/pet/house/Garden.tsx": "illustration",
  "features/profile/widgets/scenes.tsx": "illustration",
  "features/naval/Ship.tsx": "illustration",
  "styles/naval.css": "illustration (thèmes de la bataille navale)",
  "styles/scenes.css": "illustration",

  // Decorative particles: confetti and screen effects.
  "features/games/Confetti.tsx": "particules",
  "features/chat/ScreenEffect.tsx": "particules",
  "components/photo/EffectLayer.tsx": "particules",

  // Palettes offered to choose from (and painted on a canvas).
  "features/profile/partStyle.ts": "palettes des thèmes prêts",
  "features/profile/StyleControls.tsx": "nuancier",
  "features/couple/appearance.ts": "fonds au choix",
  "features/couple/SharedAppearancePanel.tsx": "valeur d'un <input type=color>",
  "components/photo/studio/PhotoStudio.tsx": "nuancier du studio photo",
  "components/photo/studio/looks.ts": "filtres photo (canvas)",
  "components/photo/studio/textStyle.ts": "texte sur photo (canvas)",
  "components/photo/studio/draw.ts": "dessin sur photo (canvas)",
  "components/photo/studio/borders.ts": "cadres photo (canvas)",
  "components/photo/studio/render.ts": "rendu photo (canvas)",
  "features/games/SnakePage.tsx": "valeurs de secours du canvas",
};

// #rgb, #rgba, #rrggbb, #rrggbbaa (not an id like url(#sky) or a &#123; entity),
// and rgb()/rgba()/hsl()/hsla() written with numbers.
const HEX = /(?<![\w&$/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const FUNC = /\b(?:rgba?|hsla?)\(\s*[\d.]/g;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(tsx?|css)$/.test(name)) yield path;
  }
}

const found = [];
for (const path of files(src)) {
  const rel = relative(src, path).split(sep).join("/");
  if (ALLOWED[rel]) continue;
  readFileSync(path, "utf8").split("\n").forEach((line, i) => {
    for (const m of [...line.matchAll(HEX), ...line.matchAll(FUNC)]) {
      found.push(`src/${rel}:${i + 1}  ${m[0]}${m[0].startsWith("#") ? "" : "…)"}`);
    }
  });
}

if (found.length) {
  console.error(`✗ ${found.length} couleur(s) écrite(s) en dur hors de src/styles/tokens.css :\n`);
  for (const f of found) console.error("  " + f);
  console.error("\nUtilise un token (var(--…)) ou une classe Tailwind ; ajoute-en un dans tokens.css s'il manque.");
  process.exit(1);
}
console.log(`✓ Tokens : aucune couleur en dur hors de tokens.css (${Object.keys(ALLOWED).length - 1} fichiers d'illustrations et de palettes à part).`);
