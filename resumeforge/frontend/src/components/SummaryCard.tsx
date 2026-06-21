import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";
import { api } from "../api/client";
import { resolveProvider } from "../api/resolveProvider";
import { AIWriteDialog } from "./AIWriteDialog";

export function SummaryCard() {
  const { bank, active, setActive, updateSummary, settings, showToast } = useResumeStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [aiOpen, setAiOpen] = useState(false);

  if (!bank || !active) return null;

  const included = active.include_summary;

  const toggleInclude = () => setActive({ ...active, include_summary: !included });

  const startEdit = () => {
    setDraft(bank.summary ?? "");
    setEditing(true);
  };

  const save = async () => {
    await updateSummary(draft);
    setEditing(false);
    showToast("Summary saved");
  };

  const generateSummary = async (styleHint: string) => {
    const { provider, model } = resolveProvider(settings);
    const res = await api.aiSummary(provider, model, styleHint || undefined);
    return res.summary;
  };

  return (
    <>
      <div
        className={`rounded-lg border p-4 bg-white shadow-sm transition-all ${
          included ? "border-blue-200" : "border-gray-200 opacity-60"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={included}
              onChange={toggleInclude}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span className="text-sm font-semibold uppercase tracking-wide text-gray-600">
              Summary
            </span>
          </div>
          <div className="flex gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
              onClick={() => setAiOpen(true)}
            >
              <Sparkles size={12} /> Generate
            </button>
            {!editing && (
              <button className="btn-secondary text-xs py-1" onClick={startEdit}>
                Edit
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              className="input w-full resize-none"
              rows={4}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button className="btn-primary text-sm" onClick={save}>Save</button>
              <button className="btn-secondary text-sm" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <p
            className="text-sm text-gray-700 leading-relaxed cursor-pointer hover:bg-gray-50 rounded p-1 -m-1"
            onClick={startEdit}
          >
            {bank.summary || (
              <span className="text-gray-400 italic">No summary yet. Click Edit or Generate.</span>
            )}
          </p>
        )}
      </div>

      <AIWriteDialog
        mode="summary"
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onGenerate={generateSummary}
        onAccept={async (text) => {
          await updateSummary(text);
          showToast("Summary updated");
        }}
      />
    </>
  );
}
