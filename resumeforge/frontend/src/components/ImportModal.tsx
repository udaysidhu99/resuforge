import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Upload } from "lucide-react";
import { api, Bank, Section } from "../api/client";
import { useResumeStore } from "../store/useResumeStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SECTIONS: Section[] = ["work_experience", "education", "projects"];

export function ImportModal({ open, onClose }: Props) {
  const { bank: currentBank, init, showToast } = useResumeStore();
  const [tab, setTab] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [draft, setDraft] = useState<Partial<Bank> | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  const parse = async () => {
    setParsing(true);
    try {
      let result: Partial<Bank>;
      if (tab === "file" && file) {
        const fd = new FormData();
        fd.append("file", file);
        result = await api.importCv(fd);
      } else {
        const fd = new FormData();
        fd.append("text", pastedText);
        result = await api.importCv(fd);
      }
      setDraft(result);
      const allKeys = new Set<string>();
      SECTIONS.forEach((s) => (result[s] as any[])?.forEach((b: any) => allKeys.add(`${s}:${b.id}`)));
      if (result.summary) allKeys.add("summary");
      if (result.skills) allKeys.add("skills");
      if (result.interests) allKeys.add("interests");
      if (result.personal) allKeys.add("personal");
      setAccepted(allKeys);
    } catch (e: any) {
      showToast(e.message ?? "Parse failed", "error");
    } finally {
      setParsing(false);
    }
  };

  const replaceSelected = async () => {
    if (!draft || !currentBank) return;
    try {
      const newBank: Bank = {
        personal:        accepted.has("personal")  ? draft.personal!       : currentBank.personal,
        summary:         accepted.has("summary")   ? draft.summary!        : currentBank.summary,
        skills:          accepted.has("skills")    ? (draft.skills ?? []) as any : currentBank.skills,
        interests:       accepted.has("interests") ? (draft.interests ?? []) : currentBank.interests,
        work_experience: [],
        education:       [],
        projects:        [],
      };
      for (const s of SECTIONS) {
        const blocks = ((draft[s] as any[]) ?? []).filter((b: any) => accepted.has(`${s}:${b.id}`));
        newBank[s] = blocks as any;
      }
      await api.replaceBank(newBank);

      // Activate all imported blocks by default
      const newActive = {
        include_summary: accepted.has("summary") && !!newBank.summary,
        work_experience: newBank.work_experience.map((b: any) => ({ id: b.id })),
        education:       newBank.education.map((b: any) => ({ id: b.id })),
        projects:        newBank.projects.map((b: any) => ({ id: b.id })),
        skills:          newBank.skills.map((s: any) => ({ id: s.id })),
        include_interests: accepted.has("interests") && newBank.interests.length > 0,
      };
      await api.updateActive(newActive);

      await init();
      showToast("CV imported");
      onClose();
      setDraft(null);
    } catch (e: any) {
      showToast(e.message ?? "Import failed", "error");
    }
  };

  const toggle = (key: string) =>
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl z-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">Import CV</Dialog.Title>
            <Dialog.Close className="p-1 rounded hover:bg-gray-100">
              <X size={18} />
            </Dialog.Close>
          </div>

          {!draft ? (
            <>
              <div className="flex gap-4 mb-4">
                <button
                  className={`text-sm px-3 py-1.5 rounded-md font-medium ${tab === "file" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                  onClick={() => setTab("file")}
                >
                  Upload File
                </button>
                <button
                  className={`text-sm px-3 py-1.5 rounded-md font-medium ${tab === "text" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                  onClick={() => setTab("text")}
                >
                  Paste Text
                </button>
              </div>

              {tab === "file" ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-blue-400 transition-colors">
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    {file ? file.name : "Click to upload PDF or DOCX"}
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              ) : (
                <textarea
                  className="input w-full resize-none"
                  rows={10}
                  placeholder="Paste your CV text here..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                />
              )}

              <div className="flex justify-end mt-4">
                <button
                  className="btn-primary"
                  onClick={parse}
                  disabled={parsing || (tab === "file" ? !file : !pastedText.trim())}
                >
                  {parsing ? "Parsing with AI…" : "Parse with AI"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Review what was parsed. Toggle sections on/off, then click Import — this <strong>replaces</strong> your current bank with the selected sections.
              </p>

              {/* Fallback if LLM returned an unexpected structure */}
              {!draft.personal && !draft.summary && !SECTIONS.some((s) => (draft[s] as any[])?.length) && !draft.skills && !draft.interests && (
                <div className="px-3 py-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  The AI returned data in an unexpected format. Try re-importing, or switch to a different model in Settings.
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-red-500">Show raw response</summary>
                    <pre className="mt-1 text-xs overflow-auto max-h-40 whitespace-pre-wrap">{JSON.stringify(draft, null, 2)}</pre>
                  </details>
                </div>
              )}

              <div className="space-y-3">
                {draft.personal && (
                  <CheckSection
                    label="Personal Info"
                    id="personal"
                    checked={accepted.has("personal")}
                    onToggle={() => toggle("personal")}
                  >
                    <p className="text-sm">{draft.personal.name} — {draft.personal.email}</p>
                  </CheckSection>
                )}

                {draft.summary && (
                  <CheckSection
                    label="Summary"
                    id="summary"
                    checked={accepted.has("summary")}
                    onToggle={() => toggle("summary")}
                  >
                    <p className="text-sm text-gray-600 line-clamp-2">{draft.summary}</p>
                  </CheckSection>
                )}

                {SECTIONS.map((s) =>
                  (draft[s] as any[])?.map((block: any) => (
                    <CheckSection
                      key={`${s}:${block.id}`}
                      label={`${sectionLabel(s)}: ${block.company || block.institution || block.title}`}
                      id={`${s}:${block.id}`}
                      checked={accepted.has(`${s}:${block.id}`)}
                      onToggle={() => toggle(`${s}:${block.id}`)}
                    >
                      <p className="text-xs text-gray-500">{block.dates}</p>
                    </CheckSection>
                  ))
                )}

                {draft.skills && (
                  <CheckSection
                    label="Skills"
                    id="skills"
                    checked={accepted.has("skills")}
                    onToggle={() => toggle("skills")}
                  >
                    <p className="text-xs text-gray-500">Programming, Data Engineering, etc.</p>
                  </CheckSection>
                )}

                {draft.interests && (
                  <CheckSection
                    label="Interests"
                    id="interests"
                    checked={accepted.has("interests")}
                    onToggle={() => toggle("interests")}
                  >
                    <p className="text-xs text-gray-500">{draft.interests.length} items</p>
                  </CheckSection>
                )}
              </div>

              <div className="flex justify-between mt-6 pt-4 border-t">
                <button className="btn-secondary" onClick={() => setDraft(null)}>
                  Back
                </button>
                <button className="btn-primary" onClick={replaceSelected}>
                  Import &amp; Replace Bank
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function sectionLabel(s: Section) {
  if (s === "work_experience") return "Work";
  if (s === "education") return "Education";
  return "Project";
}

function CheckSection({
  label,
  id,
  checked,
  onToggle,
  children,
}: {
  label: string;
  id: string;
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 p-3 border rounded-lg bg-gray-50">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onToggle}
        className="mt-1 w-4 h-4 accent-blue-600 flex-shrink-0"
      />
      <div>
        <label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </label>
        {children}
      </div>
    </div>
  );
}
