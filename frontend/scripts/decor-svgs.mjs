// Extracts the house decor SVGs named in the catalog (backend decor.json,
// "src": "<iconify set>:<icon>") from the free emoji sets published on npm
// (@iconify-json/fluent-emoji, fluent-emoji-flat, twemoji, noto), as they are,
// into src/features/pet/house/decor/<id>.svg. Run from frontend/:
//   node scripts/decor-svgs.mjs
// Downloads the sets once into a temporary folder (npm pack); nothing is added
// to package.json.
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CATALOG = "../backend/src/main/resources/pet/decor.json";
const OUT = "src/features/pet/house/decor";
const SETS = {
  "fluent-emoji": "Fluent Emoji © Microsoft, MIT licence — github.com/microsoft/fluentui-emoji",
  "fluent-emoji-flat": "Fluent Emoji (flat) © Microsoft, MIT licence — github.com/microsoft/fluentui-emoji",
  twemoji: "Twemoji © Twitter / X and contributors, CC BY 4.0 — github.com/jdecked/twemoji",
  noto: "Noto Emoji © Google, Apache licence 2.0 — github.com/googlefonts/noto-emoji",
};

// Drawings the house needs besides the catalog: what shows before anything is chosen.
const DEFAULTS = [{ id: "maison-defaut", src: "fluent-emoji:house-with-garden" }];

const catalog = [...JSON.parse(readFileSync(CATALOG, "utf8")), ...DEFAULTS];
const tmp = mkdtempSync(join(tmpdir(), "decor-"));
const sets = {};
function set(name) {
  if (!sets[name]) {
    execSync(`npm pack -q @iconify-json/${name}`, { cwd: tmp });
    execSync(`mkdir ${name} && tar -xzf iconify-json-${name}-*.tgz -C ${name}`, { cwd: tmp, shell: "/bin/sh" });
    sets[name] = JSON.parse(readFileSync(join(tmp, name, "package", "icons.json"), "utf8"));
  }
  return sets[name];
}

/** One icon as a standalone SVG (aliases resolved to their parent, as drawn). */
function svg(data, name) {
  const alias = data.aliases?.[name];
  const icon = data.icons[alias ? alias.parent : name];
  if (!icon) throw new Error(`absent : ${name}`);
  const w = icon.width ?? data.width ?? 16;
  const h = icon.height ?? data.height ?? 16;
  const flip = alias?.hFlip || icon.hFlip;
  const body = flip ? `<g transform="translate(${w} 0) scale(-1 1)">${icon.body}</g>` : icon.body;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.left ?? 0} ${icon.top ?? 0} ${w} ${h}">${body}</svg>\n`;
}

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
const used = new Set();
for (const item of catalog) {
  if (!item.src) continue;
  const [setName, icon] = item.src.split(":");
  used.add(setName);
  writeFileSync(join(OUT, `${item.id}.svg`), svg(set(setName), icon));
}
writeFileSync(
  join(OUT, "CREDITS.md"),
  `# Crédits des dessins de la maison\n\nLes fichiers de ce dossier sont repris tels quels de ces jeux d'emoji libres :\n\n${[...used]
    .sort()
    .map((s) => `- ${SETS[s]}`)
    .join("\n")}\n`,
);
console.log(`${catalog.filter((i) => i.src).length} dessins écrits dans ${OUT}`);
