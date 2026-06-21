import { useState } from "react";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { SkillBlock } from "../api/client";
import { useResumeStore } from "../store/useResumeStore";

export function SkillsEditor() {
  const { bank, active, toggleBlockInActive, reorderActiveSection, addSkill, updateSkill, deleteSkill, showToast } =
    useResumeStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SkillBlock>({ id: "", label: "", content: "" });
  const [addingNew, setAddingNew] = useState(false);
  const [newSkill, setNewSkill] = useState({ label: "", content: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (!bank || !active) return null;

  const activeSkillIds = active.skills.map((e) => e.id);

  const startEdit = (skill: SkillBlock) => {
    setDraft({ ...skill });
    setEditingId(skill.id);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!draft.label.trim()) return;
    await updateSkill(draft);
    setEditingId(null);
    showToast("Skill saved");
  };

  const handleAdd = async () => {
    if (!newSkill.label.trim()) return;
    const created = await addSkill(newSkill);
    // auto-add to active
    await toggleBlockInActive("skills", created.id);
    setNewSkill({ label: "", content: "" });
    setAddingNew(false);
    showToast("Skill added");
  };

  const handleDelete = async (id: string) => {
    await deleteSkill(id);
    setDeleteConfirm(null);
    showToast("Skill removed");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active: dragActive, over } = event;
    if (!over || dragActive.id === over.id) return;
    const oldIdx = activeSkillIds.indexOf(dragActive.id as string);
    const newIdx = activeSkillIds.indexOf(over.id as string);
    reorderActiveSection("skills", arrayMove(activeSkillIds, oldIdx, newIdx));
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Skills</span>
        <button
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          onClick={() => { setAddingNew(true); setEditingId(null); }}
        >
          <Plus size={12} /> Add skill
        </button>
      </div>

      <div className="p-3 space-y-1.5">
        {/* Bank skills — all skills, toggleable */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={bank.skills.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {bank.skills.map((skill) => {
              const included = activeSkillIds.includes(skill.id);
              const isEditing = editingId === skill.id;

              return (
                <SkillRow
                  key={skill.id}
                  skill={skill}
                  included={included}
                  isEditing={isEditing}
                  draft={draft}
                  onToggle={() => toggleBlockInActive("skills", skill.id)}
                  onEdit={() => startEdit(skill)}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={saveEdit}
                  onDraftChange={setDraft}
                  onDeleteRequest={() => setDeleteConfirm(skill.id)}
                />
              );
            })}
          </SortableContext>
        </DndContext>

        {/* Add new skill form */}
        {addingNew && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
            <input
              className="input text-sm"
              placeholder="Category label (e.g. Cloud Platforms)"
              value={newSkill.label}
              onChange={(e) => setNewSkill((n) => ({ ...n, label: e.target.value }))}
              autoFocus
            />
            <textarea
              className="input text-sm resize-none"
              rows={2}
              placeholder="Skill content (e.g. AWS (Advanced), GCP (Intermediate))"
              value={newSkill.content}
              onChange={(e) => setNewSkill((n) => ({ ...n, content: e.target.value }))}
            />
            <div className="flex gap-2">
              <button className="btn-primary text-xs py-1 flex items-center gap-1" onClick={handleAdd}>
                <Check size={12} /> Add
              </button>
              <button
                className="btn-secondary text-xs py-1 flex items-center gap-1"
                onClick={() => { setAddingNew(false); setNewSkill({ label: "", content: "" }); }}
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="mx-3 mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700 mb-2">
            Delete "{bank.skills.find((s) => s.id === deleteConfirm)?.label}"?
          </p>
          <div className="flex gap-2">
            <button
              className="btn-primary bg-red-600 hover:bg-red-700 text-xs py-1"
              onClick={() => handleDelete(deleteConfirm)}
            >
              Delete
            </button>
            <button className="btn-secondary text-xs py-1" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  skill: SkillBlock;
  included: boolean;
  isEditing: boolean;
  draft: SkillBlock;
  onToggle: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDraftChange: (d: SkillBlock) => void;
  onDeleteRequest: () => void;
}

function SkillRow({
  skill, included, isEditing, draft,
  onToggle, onEdit, onCancelEdit, onSaveEdit, onDraftChange, onDeleteRequest,
}: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: skill.id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 space-y-2">
        <input
          className="input text-sm font-medium"
          value={draft.label}
          onChange={(e) => onDraftChange({ ...draft, label: e.target.value })}
          placeholder="Category label"
          autoFocus
        />
        <textarea
          className="input text-sm resize-none"
          rows={2}
          value={draft.content}
          onChange={(e) => onDraftChange({ ...draft, content: e.target.value })}
          placeholder="Skill content"
        />
        <div className="flex gap-2">
          <button className="btn-primary text-xs py-1 flex items-center gap-1" onClick={onSaveEdit}>
            <Check size={12} /> Save
          </button>
          <button className="btn-secondary text-xs py-1 flex items-center gap-1" onClick={onCancelEdit}>
            <X size={12} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 p-2.5 rounded-lg border transition-all ${
        included ? "border-blue-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"
      }`}
    >
      <button
        className="mt-0.5 cursor-grab touch-none text-gray-300 hover:text-gray-400 flex-shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>

      <input
        type="checkbox"
        checked={included}
        onChange={onToggle}
        className="mt-0.5 w-3.5 h-3.5 rounded accent-blue-600 flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-700">{skill.label}</p>
        <p className="text-xs text-gray-500 truncate">{skill.content}</p>
      </div>

      <button className="p-1 text-gray-300 hover:text-blue-600 flex-shrink-0" onClick={onEdit}>
        <Pencil size={12} />
      </button>
      <button className="p-1 text-gray-300 hover:text-red-500 flex-shrink-0" onClick={onDeleteRequest}>
        <Trash2 size={12} />
      </button>
    </div>
  );
}
