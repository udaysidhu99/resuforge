import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Settings2, FileDown, Plus, Upload, CheckCircle, XCircle, UserCircle2, Target, BookmarkPlus } from "lucide-react";

import { useResumeStore } from "./store/useResumeStore";
import { Section, Block, MatchResult } from "./api/client";
import { api } from "./api/client";
import { BlockCard } from "./components/BlockCard";
import { BlockEditModal } from "./components/BlockEditModal";
import { SummaryCard } from "./components/SummaryCard";
import { PersonalCard } from "./components/PersonalCard";
import { SkillsEditor } from "./components/SkillsEditor";
import { InterestsEditor } from "./components/InterestsEditor";
import { LivePreview } from "./components/LivePreview";
import { SettingsModal } from "./components/SettingsModal";
import { ImportModal } from "./components/ImportModal";
import { PhotoUploadModal } from "./components/PhotoUploadModal";
import { FullscreenPreview } from "./components/FullscreenPreview";
import { ResumatchView } from "./components/ResumatchView";
import { SnapshotsModal } from "./components/SnapshotsModal";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "work_experience", label: "Work Experience" },
  { key: "education", label: "Education" },
  { key: "projects", label: "Projects" },
];

export default function App() {
  const { bank, active, loading, toast, init, toggleBlockInActive, reorderActiveSection, deleteBankBlock, showToast } =
    useResumeStore();

  const [view, setView] = useState<"builder" | "resumatch">("builder");
  const [matchJd, setMatchJd] = useState("");
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [editModal, setEditModal] = useState<{ section: Section; block: Block | null } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ section: Section; id: string } | null>(null);

  useEffect(() => {
    init();
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        exportPdf();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const exportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await api.buildPdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume.pdf";
      a.click();
      URL.revokeObjectURL(url);
      showToast("PDF downloaded");
    } catch (e: any) {
      showToast(e.message ?? "Export failed", "error");
    } finally {
      setExporting(false);
    }
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent, section: Section) => {
    const { active: dragActive, over } = event;
    if (!over || dragActive.id === over.id || !active) return;
    const ids = active[section].map((e) => e.id);
    const oldIdx = ids.indexOf(dragActive.id as string);
    const newIdx = ids.indexOf(over.id as string);
    const newIds = arrayMove(ids, oldIdx, newIdx);
    reorderActiveSection(section, newIds);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Loading ResumeForge…</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Topbar */}
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold text-blue-600">ResuForge</span>
          <nav className="flex items-center gap-1">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === "builder"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setView("builder")}
            >
              Builder
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === "resumatch"
                  ? "bg-purple-50 text-purple-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setView("resumatch")}
            >
              <Target size={14} /> Resumatch
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2" onClick={() => setImportOpen(true)}>
            <Upload size={15} /> Import CV
          </button>
          <button className="btn-secondary flex items-center gap-2" onClick={() => setSettingsOpen(true)}>
            <Settings2 size={15} /> Settings
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={exportPdf}
            disabled={exporting}
          >
            <FileDown size={15} /> {exporting ? "Exporting…" : "Export PDF"}
          </button>
        </div>
      </header>

      {view === "resumatch" && (
        <ResumatchView
          jd={matchJd}
          setJd={setMatchJd}
          result={matchResult}
          setResult={setMatchResult}
        />
      )}

      {/* Three panels */}
      <div className={`flex flex-1 overflow-hidden ${view === "resumatch" ? "hidden" : ""}`}>
        {/* ── PANEL 1: Block Bank ── */}
        <div className="panel w-72 flex-shrink-0">
          <div className="panel-header">
            <span className="text-sm font-semibold">Block Bank</span>
            <button
              className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={() => setPhotoOpen(true)}
              title="Upload profile photo"
            >
              <UserCircle2 size={18} />
            </button>
          </div>

          <div className="panel-body">
            {SECTIONS.map(({ key, label }) => (
              <div key={key}>
                <p className="section-heading">{label}</p>
                {((bank?.[key] as Block[]) ?? []).map((block) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    section={key}
                    included={(active?.[key] ?? []).some((e) => e.id === block.id)}
                    onToggle={() => toggleBlockInActive(key, block.id)}
                    onEdit={() => setEditModal({ section: key, block })}
                    onDelete={() => setDeleteConfirm({ section: key, id: block.id })}
                    showDelete
                  />
                ))}
                <button
                  className="w-full mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 py-1"
                  onClick={() => setEditModal({ section: key, block: null })}
                >
                  <Plus size={12} /> Add {label}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── PANEL 2: Active Resume ── */}
        <div className="panel flex-1 min-w-0">
          <div className="panel-header">
            <span className="text-sm font-semibold">Active Resume</span>
            <button
              className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={() => setSnapshotsOpen(true)}
              title="Saved versions"
            >
              <BookmarkPlus size={16} />
            </button>
          </div>
          <div className="panel-body">
            <PersonalCard />
            <SummaryCard />

            {SECTIONS.map(({ key, label }) => {
              const activeEntries = active?.[key] ?? [];
              const bankMap = Object.fromEntries(
                ((bank?.[key] as Block[]) ?? []).map((b) => [b.id, b])
              );
              const activeBlocks = activeEntries
                .map((e) => bankMap[e.id])
                .filter(Boolean) as Block[];

              return (
                <div key={key}>
                  <p className="section-heading">{label}</p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(e, key)}
                  >
                    <SortableContext
                      items={activeBlocks.map((b) => b.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {activeBlocks.map((block) => {
                        const entry = activeEntries.find((e) => e.id === block.id);
                        return (
                          <BlockCard
                            key={block.id}
                            block={block}
                            section={key}
                            included
                            maxBullets={entry?.max_bullets}
                            onToggle={() => toggleBlockInActive(key, block.id)}
                            onEdit={() => setEditModal({ section: key, block })}
                            draggable
                          />
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                  {activeBlocks.length === 0 && (
                    <p className="text-xs text-gray-400 py-2 text-center">
                      Toggle blocks from the bank to add them here
                    </p>
                  )}
                </div>
              );
            })}

            <SkillsEditor />
            <InterestsEditor />
          </div>
        </div>

        {/* ── PANEL 3: Live Preview ── */}
        <div className="flex-1 min-w-0 overflow-hidden border-l border-gray-200">
          <div className="panel-header bg-gray-50">
            <span className="text-sm font-semibold">Live Preview</span>
          </div>
          <div className="h-[calc(100%-45px)]">
            <LivePreview onFullscreen={() => setFullscreen(true)} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {editModal && (
        <BlockEditModal
          section={editModal.section}
          block={editModal.block}
          open={!!editModal}
          onClose={() => setEditModal(null)}
        />
      )}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SnapshotsModal open={snapshotsOpen} onClose={() => setSnapshotsOpen(false)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <PhotoUploadModal open={photoOpen} onClose={() => setPhotoOpen(false)} />
      {fullscreen && <FullscreenPreview onClose={() => setFullscreen(false)} />}

      {/* Delete confirm dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <p className="text-sm font-medium mb-1">Delete block?</p>
            <p className="text-sm text-gray-500 mb-5">
              This permanently removes the block from your bank.
            </p>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn-primary bg-red-600 hover:bg-red-700"
                onClick={async () => {
                  await deleteBankBlock(deleteConfirm.section, deleteConfirm.id);
                  setDeleteConfirm(null);
                  showToast("Block deleted");
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all z-50 ${
            toast.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200"
          }`}
        >
          {toast.type === "error" ? (
            <XCircle size={16} />
          ) : (
            <CheckCircle size={16} />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
