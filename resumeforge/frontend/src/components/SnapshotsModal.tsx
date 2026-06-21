import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, RotateCcw, Trash2, BookmarkPlus, Check } from "lucide-react";
import { api, Snapshot } from "../api/client";
import { useResumeStore } from "../store/useResumeStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function SnapshotsModal({ open, onClose }: Props) {
  const { init, showToast } = useResumeStore();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = async () => {
    try {
      setSnapshots(await api.getSnapshots());
    } catch {}
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.saveSnapshot(name.trim());
      setName("");
      await load();
      showToast("Version saved");
    } catch (e: any) {
      showToast(e.message ?? "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const restore = async (id: string) => {
    setRestoring(id);
    try {
      await api.restoreSnapshot(id);
      await init();
      showToast("Version restored");
      onClose();
    } catch (e: any) {
      showToast(e.message ?? "Restore failed", "error");
    } finally {
      setRestoring(null);
    }
  };

  const deleteSnap = async (id: string) => {
    try {
      await api.deleteSnapshot(id);
      setConfirmDelete(null);
      await load();
      showToast("Version deleted");
    } catch (e: any) {
      showToast(e.message ?? "Delete failed", "error");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-50 p-6">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-gray-800">Saved Versions</Dialog.Title>
            <Dialog.Close className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={16} />
            </Dialog.Close>
          </div>

          {/* Save new snapshot */}
          <div className="flex gap-2 mb-5">
            <input
              className="input flex-1 text-sm"
              placeholder="Name this version…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <button
              className="btn-primary flex items-center gap-1.5 text-sm flex-shrink-0"
              onClick={save}
              disabled={saving || !name.trim()}
            >
              <BookmarkPlus size={14} />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          {/* Snapshot list */}
          {snapshots.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-6">
              No saved versions yet.
            </p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {[...snapshots].reverse().map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400">{relativeDate(s.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {confirmRestore === s.id ? (
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50"
                        onClick={() => { setConfirmRestore(null); restore(s.id); }}
                        disabled={restoring === s.id}
                      >
                        <Check size={12} /> Confirm
                      </button>
                    ) : (
                      <button
                        className="p-1.5 rounded-md text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
                        onClick={() => { setConfirmDelete(null); setConfirmRestore(s.id); }}
                        disabled={restoring === s.id}
                        title="Restore — replaces all resume content"
                      >
                        {restoring === s.id
                          ? <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full" />
                          : <RotateCcw size={14} />
                        }
                      </button>
                    )}
                    {confirmDelete === s.id ? (
                      <button
                        className="p-1.5 rounded-md text-white bg-red-500 hover:bg-red-600 transition-colors"
                        onClick={() => deleteSnap(s.id)}
                        title="Confirm delete"
                      >
                        <Check size={14} />
                      </button>
                    ) : (
                      <button
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        onClick={() => { setConfirmRestore(null); setConfirmDelete(s.id); }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
