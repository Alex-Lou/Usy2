import { Input } from "../../../components/ui/Input";
import type { Pin } from "../types";
import { isWebAddress, MAX_PINS, normalizePinUrl, PIN_SUGGESTIONS } from "./pinSuggestions";

/** Edits a pins widget: title, the list of links, and one-tap suggestions. */
export function PinsEditor({
  label,
  pins,
  onChange,
}: {
  label?: string;
  pins: Pin[];
  onChange: (patch: { label?: string; pins?: Pin[] }) => void;
}) {
  const full = pins.length >= MAX_PINS;
  const setPin = (i: number, patch: Partial<Pin>) => onChange({ pins: pins.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const has = (url: string) => pins.some((p) => p.url === url);

  return (
    <div className="flex flex-col gap-2">
      <Input value={label ?? ""} maxLength={40} placeholder="titre (ex. Accès rapides)" onChange={(e) => onChange({ label: e.target.value })} />
      {pins.map((pin, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Input value={pin.label ?? ""} maxLength={40} placeholder="nom (optionnel)" onChange={(e) => setPin(i, { label: e.target.value })} />
            <Input
              value={pin.url}
              maxLength={2048}
              inputMode="url"
              placeholder="adresse du site (ex. pinterest.com)"
              onChange={(e) => setPin(i, { url: e.target.value })}
              onBlur={(e) => setPin(i, { url: normalizePinUrl(e.target.value) })}
            />
            {pin.url && !isWebAddress(normalizePinUrl(pin.url)) && <span className="text-xs text-danger">Adresse de site invalide</span>}
          </div>
          <button
            type="button"
            onClick={() => onChange({ pins: pins.filter((_, j) => j !== i) })}
            aria-label={`Retirer ${pin.label || pin.url || "ce lien"}`}
            className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-muted press hover:text-danger"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={full}
        onClick={() => onChange({ pins: [...pins, { url: "", label: "" }] })}
        className="chip self-start press disabled:opacity-50"
      >
        + Ajouter un lien
      </button>
      <details className="rounded-token border border-border bg-bg-2/40 px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold">Idées à épingler</summary>
        <div className="mt-2 flex flex-col gap-2">
          {PIN_SUGGESTIONS.map((g) => (
            <div key={g.group}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{g.group}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.pins.map((s) => (
                  <button
                    key={s.url}
                    type="button"
                    disabled={full || has(s.url)}
                    onClick={() => onChange({ pins: [...pins.filter((p) => p.url.trim()), s] })}
                    className="chip press disabled:opacity-50"
                  >
                    {has(s.url) ? "✓ " : "+ "}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
      <p className="text-[11px] text-text-muted">{pins.length}/{MAX_PINS} liens</p>
    </div>
  );
}
