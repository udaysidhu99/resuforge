import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";

export function InterestsEditor() {
  const { bank, active, setActive, updateInterests, showToast } = useResumeStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");

  if (!bank || !active) return null;

  const included = active.include_interests;

  const startEdit = () => {
    setDraft([...bank.interests]);
    setEditing(true);
  };

  const save = async () => {
    await updateInterests(draft);
    setEditing(false);
    showToast("Interests saved");
  };

  const addItem = () => {
    const t = newItem.trim();
    if (t) setDraft((d) => [...d, t]);
    setNewItem("");
  };

  return (
    <div
      className={`rounded-lg border p-4 bg-white shadow-sm transition-all ${
        included ? "border-blue-200" : "border-gray-200 opacity-60"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={included}
            onChange={() => setActive({ ...active, include_interests: !included })}
            className="w-4 h-4 rounded accent-blue-600"
          />
          <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            Interests
          </span>
        </div>
        {!editing ? (
          <button className="btn-secondary text-xs py-1" onClick={startEdit}>
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button className="btn-primary text-xs py-1" onClick={save}>
              Save
            </button>
            <button className="btn-secondary text-xs py-1" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          {draft.map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className="input flex-1 text-sm"
                value={item}
                onChange={(e) => {
                  const d = [...draft];
                  d[i] = e.target.value;
                  setDraft(d);
                }}
              />
              <button
                className="text-red-400 hover:text-red-600"
                onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              placeholder="Add interest"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
            />
            <button className="btn-secondary" onClick={addItem}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      ) : (
        <ul className="space-y-1">
          {bank.interests.map((item, i) => (
            <li key={i} className="text-sm text-gray-700 flex items-start gap-1">
              <span className="text-gray-400">•</span> {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
