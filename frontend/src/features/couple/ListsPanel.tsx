import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Input";
import { onCoupleActivity } from "./activity";
import { addItem, clearDone, createList, deleteItem, deleteList, getLists, renameList, setItemDone } from "./api";
import type { SharedList } from "./types";

/** Shared named lists: both people add, check off and tidy up any of them. */
export function ListsPanel() {
  const [lists, setLists] = useState<SharedList[] | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    getLists()
      .then((all) => setLists(all))
      .catch(() => setError("Impossible de charger les listes."));
  }, []);

  useEffect(() => {
    reload();
    return onCoupleActivity((a) => {
      if (a.kind === "list" || a.kind === "list-change") reload();
    });
  }, [reload]);

  const replace = (updated: SharedList) =>
    setLists((prev) => prev?.map((l) => (l.id === updated.id ? updated : l)) ?? prev);

  // Every call returns the fresh list; failures surface one short message.
  async function run<T>(action: () => Promise<T>, then: (result: T) => void) {
    setError(null);
    try {
      then(await action());
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Action impossible.");
    }
  }

  // Ticking must feel instant: show it now, re-sync from the server if it fails.
  function toggle(itemId: number, done: boolean) {
    setLists((prev) =>
      prev?.map((l) => ({ ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done } : i)) })) ?? prev,
    );
    setError(null);
    setItemDone(itemId, done)
      .then(replace)
      .catch(() => {
        setError("Impossible de cocher, réessaie.");
        reload(); // rollback to the server's state
      });
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    void run(() => createList(name), (list) => {
      setLists((prev) => [...(prev ?? []), list]);
      setOpenId(list.id);
      setNewName("");
    });
  }

  if (lists === null) {
    return error ? <p className="text-sm text-danger">{error}</p> : <p className="text-sm text-text-muted">Chargement…</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {lists.length === 0 && <p className="text-sm text-text-muted">Aucune liste pour l'instant (courses, films à voir…).</p>}

      {lists.map((list) => (
        <ListCard
          key={list.id}
          list={list}
          open={openId === list.id}
          onToggle={() => setOpenId(openId === list.id ? null : list.id)}
          onAdd={(text) => run(() => addItem(list.id, text), replace)}
          onDone={toggle}
          onRemoveItem={(itemId) => run(() => deleteItem(itemId), replace)}
          onClearDone={() => run(() => clearDone(list.id), replace)}
          onRename={(name) => run(() => renameList(list.id, name), replace)}
          onDelete={() =>
            run(() => deleteList(list.id), () => setLists((prev) => prev?.filter((l) => l.id !== list.id) ?? prev))
          }
        />
      ))}

      <form onSubmit={create} className="flex gap-2">
        <Input value={newName} maxLength={40} placeholder="Nouvelle liste" onChange={(e) => setNewName(e.target.value)} />
        <Button type="submit" variant="surface" disabled={!newName.trim()} className="!px-3" aria-label="Créer la liste">
          <Icon name="plus" size={16} />
        </Button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function ListCard({
  list,
  open,
  onToggle,
  onAdd,
  onDone,
  onRemoveItem,
  onClearDone,
  onRename,
  onDelete,
}: {
  list: SharedList;
  open: boolean;
  onToggle: () => void;
  onAdd: (text: string) => Promise<void>;
  onDone: (itemId: number, done: boolean) => void;
  onRemoveItem: (itemId: number) => void;
  onClearDone: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const remaining = list.items.filter((i) => !i.done).length;
  const doneCount = list.items.length - remaining;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    await onAdd(value);
  }

  return (
    <div className="rounded-token border border-border bg-surface">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="font-semibold text-text">{list.name}</span>
        <span className="text-sm text-text-muted">
          {remaining === 0 && list.items.length > 0 ? "tout est fait" : `${remaining} à faire`}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
          {list.items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <label className="flex flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={(e) => onDone(item.id, e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <span className={item.done ? "text-text-muted line-through" : "text-text"}>{item.text}</span>
              </label>
              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                className="press rounded-token p-1 text-text-muted hover:text-danger"
                aria-label={`Retirer ${item.text}`}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}

          <form onSubmit={add} className="flex gap-2">
            <Input value={text} maxLength={120} placeholder="Ajouter…" onChange={(e) => setText(e.target.value)} />
            <Button type="submit" variant="surface" disabled={!text.trim()} className="!px-3" aria-label="Ajouter">
              <Icon name="plus" size={16} />
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
            {doneCount > 0 && (
              <button type="button" onClick={onClearDone} className="chip press hover:border-primary/50">
                Retirer les cochés ({doneCount})
              </button>
            )}
            {editing ? (
              <form
                className="flex flex-1 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim()) onRename(name.trim());
                  setEditing(false);
                }}
              >
                <Input value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} />
                <Button type="submit" variant="surface" className="!px-3">OK</Button>
              </form>
            ) : (
              <button type="button" onClick={() => { setName(list.name); setEditing(true); }} className="chip press hover:border-primary/50">
                Renommer
              </button>
            )}
            <button
              type="button"
              onClick={() => window.confirm(`Supprimer la liste « ${list.name} » ?`) && onDelete()}
              className="chip press text-danger hover:border-danger"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
