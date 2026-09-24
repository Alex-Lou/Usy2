import { useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { ApiError } from "../../lib/api/client";
import type { Widget } from "../profile/types";
import { cleanWidget } from "../profile/widgets/WidgetEditor";
import { addSharedWidget } from "./api";

/**
 * Under a profile widget: puts a copy of it in the side menu, among the
 * widgets both can edit. The profile widget itself stays as it is.
 */
export function ShareWidgetButton({ widget }: { widget: Widget }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const noPhoto = widget.type === "image" && (!widget.assetId || widget.assetId <= 0);

  async function share() {
    setState("sending");
    setMessage(null);
    try {
      const { home: _home, ...copy } = cleanWidget(widget);
      await addSharedWidget(copy as Widget);
      setState("done");
    } catch (err) {
      setState("error");
      setMessage(err instanceof ApiError ? err.message : "Partage impossible.");
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={share}
        disabled={state === "sending" || noPhoto}
        className="chip press hover:border-primary/50 disabled:opacity-50"
        title={noPhoto ? "Ajoute d'abord une image" : undefined}
      >
        <Icon name={state === "done" ? "heart" : "send"} size={13} />
        {state === "done" ? "Partagé dans la barre latérale" : "Partager dans la barre latérale"}
      </button>
      {state === "done" && <span className="text-[11px] text-text-muted">Une copie : vous pouvez la modifier à deux.</span>}
      {message && <span role="alert" className="text-[11px] text-danger">{message}</span>}
    </div>
  );
}
