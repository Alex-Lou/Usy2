import { useState } from "react";
import { setSounds, setVibrations, soundsOn, vibrationsOn } from "../../lib/feel";

/** « Sons et vibrations » of this device (see feel.ts). */
export function FeelToggle() {
  const [vibrate, setVibrate] = useState(vibrationsOn);
  const [sound, setSound] = useState(soundsOn);
  const base = "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition press";
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-bg-2/60 p-1">
      <button
        type="button"
        onClick={() => {
          setVibrations(!vibrate);
          setVibrate(!vibrate);
        }}
        className={base + (vibrate ? " seg-on" : " text-text-muted hover:text-text")}
        aria-pressed={vibrate}
      >
        <span className="mc-emoji" aria-hidden="true">📳</span> Vibrations
      </button>
      <button
        type="button"
        onClick={() => {
          setSounds(!sound);
          setSound(!sound);
        }}
        className={base + (sound ? " seg-on" : " text-text-muted hover:text-text")}
        aria-pressed={sound}
      >
        <span className="mc-emoji" aria-hidden="true">{sound ? "🔔" : "🔕"}</span> Sons
      </button>
    </div>
  );
}
