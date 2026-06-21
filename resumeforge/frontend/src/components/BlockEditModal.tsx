import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus, Trash2, GripVertical, Sparkles } from "lucide-react";
import { Block, Section } from "../api/client";
import { api } from "../api/client";
import { useResumeStore } from "../store/useResumeStore";
import { resolveProvider } from "../api/resolveProvider";
import { AIWriteDialog } from "./AIWriteDialog";

interface Props {
  section: Section;
  block: Block | null;
  open: boolean;
  onClose: () => void;
}

export function BlockEditModal({ section, block, open, onClose }: Props) {
  const { updateBankBlock, addBankBlock, settings, showToast } = useResumeStore();
  const isNew = !block?.id;

  const blank: Block = {
    id: "",
    company: "",
    institution: "",
    title: "",
    location: "",
    dates: "",
    tags: [],
    bullets: [],
  };

  const [form, setForm] = useState<Block>(block ?? blank);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const handleOpenChange = (o: boolean) => {
    if (o) {
      setForm(block ?? blank);
    } else {
      onClose();
    }
  };

  const set = (field: keyof Block, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setBullet = (i: number, v: string) => {
    const b = [...(form.bullets ?? [])];
    b[i] = v;
    set("bullets", b);
  };

  const removeBullet = (i: number) => {
    const b = [...(form.bullets ?? [])];
    b.splice(i, 1);
    set("bullets", b);
  };

  const addBullet = () => set("bullets", [...(form.bullets ?? []), ""]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !(form.tags ?? []).includes(t)) {
      set("tags", [...(form.tags ?? []), t]);
    }
    setTagInput("");
  };

  const removeTag = (t: string) => set("tags", (form.tags ?? []).filter((x) => x !== t));

  const handleSave = async () => {
    try {
      if (isNew) {
        await addBankBlock(section, form);
        showToast("Block added");
      } else {
        await updateBankBlock(section, form);
        showToast("Block saved");
      }
      onClose();
    } catch (e: any) {
      showToast(e.message ?? "Save failed", "error");
    }
  };

  const generateBullets = async (description: string, styleHint: string) => {
    const { provider, model } = resolveProvider(settings);
    const blockContext: Record<string, string> = {};
    if (form.company) blockContext.company = form.company;
    if (form.institution) blockContext.company = form.institution;
    if (form.title) blockContext.title = form.title;
    if (form.degree) blockContext.title = form.degree;
    if (form.location) blockContext.location = form.location;
    if (form.dates) blockContext.dates = form.dates;

    const res = await api.aiBullets(
      description,
      provider,
      model,
      styleHint || undefined,
      Object.keys(blockContext).length ? blockContext : undefined
    );
    return res.bullets;
  };

  const blockLabel = (() => {
    const primary = form.company || form.institution || form.title || "";
    const secondary = (!form.company && !form.institution) ? "" : form.title || form.degree || "";
    return secondary ? `${primary} — ${secondary}` : primary;
  })();

  const primaryLabel =
    section === "work_experience" ? "Company"
    : section === "education" ? "Institution"
    : "Project Title";

  const primaryValue =
    section === "work_experience" ? form.company ?? ""
    : section === "education" ? form.institution ?? ""
    : form.title ?? "";

  const setPrimary = (v: string) => {
    if (section === "work_experience") set("company", v);
    else if (section === "education") set("institution", v);
    else set("title", v);
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl z-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold">
                {isNew ? "Add Block" : "Edit Block"}
              </Dialog.Title>
              <Dialog.Close className="p-1 rounded hover:bg-gray-100">
                <X size={18} />
              </Dialog.Close>
            </div>

            <div className="space-y-3">
              <Field label={primaryLabel}>
                <input className="input" value={primaryValue} onChange={(e) => setPrimary(e.target.value)} />
              </Field>

              {section !== "projects" && (
                <Field label={section === "education" ? "Degree" : "Title"}>
                  <input
                    className="input"
                    value={section === "education" ? form.degree ?? "" : form.title ?? ""}
                    onChange={(e) =>
                      section === "education" ? set("degree", e.target.value) : set("title", e.target.value)
                    }
                  />
                </Field>
              )}

              {section !== "projects" && (
                <Field label="Location">
                  <input className="input" value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} />
                </Field>
              )}

              <Field label="Dates">
                <input className="input" value={form.dates ?? ""} onChange={(e) => set("dates", e.target.value)} />
              </Field>

              {/* Tags */}
              <Field label="Tags">
                <div className="flex flex-wrap gap-1 mb-1">
                  {(form.tags ?? []).map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {t}
                      <button onClick={() => removeTag(t)}><X size={10} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Add tag and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  />
                  <button className="btn-secondary" onClick={addTag}>Add</button>
                </div>
              </Field>

              {/* Bullets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Bullets</label>
                  <button
                    className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
                    onClick={() => setAiDialogOpen(true)}
                  >
                    <Sparkles size={12} /> Generate
                  </button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {(form.bullets ?? []).map((b, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <GripVertical size={16} className="mt-2 text-gray-300 flex-shrink-0" />
                      <textarea
                        className="input flex-1 resize-none"
                        rows={3}
                        value={b}
                        onChange={(e) => setBullet(i, e.target.value)}
                      />
                      <button className="mt-2 text-red-400 hover:text-red-600" onClick={() => removeBullet(i)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button className="btn-secondary mt-2 flex items-center gap-1" onClick={addBullet}>
                  <Plus size={14} /> Add bullet manually
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Dialog.Close className="btn-secondary">Cancel</Dialog.Close>
              <button className="btn-primary" onClick={handleSave}>
                {isNew ? "Add to Bank" : "Save"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* AI dialog renders outside the main modal to avoid z-index stacking issues */}
      <AIWriteDialog
        mode="bullets"
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        blockLabel={blockLabel || undefined}
        onGenerate={generateBullets}
        onAddBullet={(bullet) => set("bullets", [...(form.bullets ?? []), bullet])}
      />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      {children}
    </div>
  );
}
