import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Sparkles, Plus, RotateCcw } from "lucide-react";

interface BulletsDialogProps {
  mode: "bullets";
  open: boolean;
  onClose: () => void;
  blockLabel?: string; // e.g. "L'Oréal — Intern, Data & Analytics"
  onGenerate: (description: string, styleHint: string) => Promise<string[]>;
  onAddBullet: (bullet: string) => void;
}

interface SummaryDialogProps {
  mode: "summary";
  open: boolean;
  onClose: () => void;
  onGenerate: (styleHint: string) => Promise<string>;
  onAccept: (summary: string) => void;
}

type Props = BulletsDialogProps | SummaryDialogProps;

export function AIWriteDialog(props: Props) {
  const [description, setDescription] = useState("");
  const [styleHint, setStyleHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [bullets, setBullets] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setDescription("");
    setStyleHint("");
    setBullets([]);
    setSummary("");
    setError("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) { reset(); props.onClose(); }
  };

  const generate = async () => {
    setLoading(true);
    setError("");
    setBullets([]);
    setSummary("");
    try {
      if (props.mode === "bullets") {
        const result = await (props as BulletsDialogProps).onGenerate(description, styleHint);
        setBullets(result);
      } else {
        const result = await (props as SummaryDialogProps).onGenerate(styleHint);
        setSummary(result);
      }
    } catch (e: any) {
      setError(e.message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const canGenerate = props.mode === "summary" || description.trim().length > 0;

  return (
    <Dialog.Root open={props.open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[60]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-[61] p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 rounded-lg">
                <Sparkles size={16} className="text-purple-600" />
              </div>
              <Dialog.Title className="text-base font-semibold text-gray-800">
                {props.mode === "bullets" ? "Generate Bullets" : "Generate Summary"}
              </Dialog.Title>
            </div>
            <Dialog.Close className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={16} />
            </Dialog.Close>
          </div>

          {/* Block label context pill */}
          {props.mode === "bullets" && (props as BulletsDialogProps).blockLabel && (
            <div className="mb-4 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 font-medium">
              ✦ Writing for: {(props as BulletsDialogProps).blockLabel}
            </div>
          )}

          <div className="space-y-4">
            {/* Description — only for bullets mode */}
            {props.mode === "bullets" && (
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                  What did you do? <span className="font-normal text-gray-400">— be as rough as you like</span>
                </label>
                <textarea
                  className="input w-full resize-none text-sm"
                  rows={5}
                  autoFocus
                  placeholder="e.g. built pipelines on GCP processing 500k rows daily, cut reporting time from 3h to 20min, worked with analytics team on Power BI dashboards, used BigQuery + Cloud Functions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate();
                  }}
                />
                <p className="text-xs text-gray-400 mt-1">⌘ Enter to generate</p>
              </div>
            )}

            {/* Style hint — both modes */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                Style instructions <span className="font-normal text-gray-400">— optional</span>
              </label>
              <input
                className="input w-full text-sm"
                placeholder={
                  props.mode === "bullets"
                    ? "e.g. focus on business impact, quantify everything, highlight leadership"
                    : "e.g. target senior data engineering roles, emphasise GCP expertise, sound confident"
                }
                value={styleHint}
                onChange={(e) => setStyleHint(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate();
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Generate button */}
            {(bullets.length === 0 && !summary) && (
              <button
                className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
                onClick={generate}
                disabled={loading || !canGenerate}
              >
                {loading ? (
                  <>
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    {props.mode === "bullets" ? "Generate bullets" : "Generate summary"}
                  </>
                )}
              </button>
            )}

            {/* Bullets results */}
            {bullets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">Click to add to your resume:</p>
                {bullets.map((b, i) => (
                  <button
                    key={i}
                    className="w-full flex items-start gap-2.5 p-3 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-xl text-left transition-colors group"
                    onClick={() => {
                      (props as BulletsDialogProps).onAddBullet(b);
                      setBullets((prev) => prev.filter((_, j) => j !== i));
                    }}
                  >
                    <Plus size={14} className="mt-0.5 text-purple-500 flex-shrink-0 group-hover:text-purple-700" />
                    <span className="text-sm text-gray-700">{b}</span>
                  </button>
                ))}
                <button
                  className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-medium mt-1"
                  onClick={generate}
                  disabled={loading}
                >
                  <RotateCcw size={11} /> Regenerate
                </button>
              </div>
            )}

            {/* Summary result */}
            {summary && (
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-gray-700 leading-relaxed">
                  {summary}
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-primary flex-1"
                    onClick={() => {
                      (props as SummaryDialogProps).onAccept(summary);
                      reset();
                      props.onClose();
                    }}
                  >
                    Use this summary
                  </button>
                  <button
                    className="btn-secondary flex items-center gap-1.5"
                    onClick={generate}
                    disabled={loading}
                  >
                    <RotateCcw size={13} /> Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
