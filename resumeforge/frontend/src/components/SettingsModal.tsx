import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, RefreshCw } from "lucide-react";
import { api, Settings } from "../api/client";
import { useResumeStore } from "../store/useResumeStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const { settings, setSettings, showToast } = useResumeStore();
  const [form, setForm] = useState<Settings | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaError, setOllamaError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && settings) {
      setForm({ ...settings });
      fetchOllamaModels();
    }
  }, [open, settings]);

  const fetchOllamaModels = async () => {
    setOllamaError("");
    try {
      const res = await api.getOllamaModels();
      setOllamaModels(res.models);
    } catch {
      setOllamaError("Ollama not reachable — make sure it's running on port 11434");
    }
  };

  const set = (field: keyof Settings, value: string) =>
    setForm((f) => (f ? { ...f, [field]: value } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const updated = await api.updateSettings(form);
      setSettings(updated);
      showToast("Settings saved");
      onClose();
    } catch (e: any) {
      showToast(e.message ?? "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-xl shadow-2xl z-50 p-6">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">Settings</Dialog.Title>
            <Dialog.Close className="p-1 rounded hover:bg-gray-100">
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                LLM Provider
              </label>
              <div className="flex gap-3">
                {["ollama", "api"].map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="provider"
                      value={p}
                      checked={form.llm_provider === p}
                      onChange={() => set("llm_provider", p)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm capitalize">
                      {p === "ollama" ? "Local (Ollama)" : "API (Cloud)"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {form.llm_provider === "ollama" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Ollama Model</label>
                  <button
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    onClick={fetchOllamaModels}
                  >
                    <RefreshCw size={11} /> Refresh
                  </button>
                </div>
                {ollamaError ? (
                  <p className="text-xs text-red-500">{ollamaError}</p>
                ) : ollamaModels.length > 0 ? (
                  <select
                    className="input w-full"
                    value={form.ollama_model}
                    onChange={(e) => set("ollama_model", e.target.value)}
                  >
                    {ollamaModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="input w-full"
                    placeholder="e.g. llama3"
                    value={form.ollama_model}
                    onChange={(e) => set("ollama_model", e.target.value)}
                  />
                )}
              </div>
            )}

            {form.llm_provider === "api" && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    API Provider
                  </label>
                  <select
                    className="input w-full"
                    value={form.api_provider}
                    onChange={(e) => set("api_provider", e.target.value)}
                  >
                    <option value="anthropic">Anthropic</option>
                    <option value="openai">OpenAI</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Model Name
                  </label>
                  <input
                    className="input w-full"
                    placeholder={
                      form.api_provider === "anthropic"
                        ? "claude-haiku-4-5-20251001"
                        : "gpt-4o-mini"
                    }
                    value={form.api_model}
                    onChange={(e) => set("api_model", e.target.value)}
                  />
                </div>

                {form.api_provider === "anthropic" && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Anthropic API Key
                    </label>
                    <input
                      type="password"
                      className="input w-full"
                      placeholder="sk-ant-..."
                      value={form.anthropic_api_key}
                      onChange={(e) => set("anthropic_api_key", e.target.value)}
                    />
                  </div>
                )}

                {form.api_provider === "openai" && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      className="input w-full"
                      placeholder="sk-..."
                      value={form.openai_api_key}
                      onChange={(e) => set("openai_api_key", e.target.value)}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Dialog.Close className="btn-secondary">Cancel</Dialog.Close>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
