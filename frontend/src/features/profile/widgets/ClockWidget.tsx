import { useEffect, useState } from "react";
import { Icon } from "../../../components/ui/Icon";

// Live clock, updates every second.
export function ClockWidget({ label }: { label?: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="flex items-center gap-3 rounded-token border border-border bg-surface px-4 py-3">
      <Icon name="clock" size={22} className="text-primary" />
      <div>
        <p className="font-display text-2xl font-bold tabular-nums text-text">{time}</p>
        {label && <p className="text-xs text-text-muted">{label}</p>}
      </div>
    </div>
  );
}
