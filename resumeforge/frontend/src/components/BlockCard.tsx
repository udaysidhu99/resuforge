import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Block, Section } from "../api/client";

interface Props {
  block: Block;
  section: Section;
  included: boolean;
  maxBullets?: number;
  onToggle: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  draggable?: boolean;
}

export function BlockCard({
  block,
  section,
  included,
  maxBullets,
  onToggle,
  onEdit,
  onDelete,
  showDelete,
  draggable = false,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const primary =
    section === "work_experience"
      ? block.company
      : section === "education"
      ? block.institution
      : block.title;

  const secondary =
    section === "work_experience"
      ? block.title
      : section === "education"
      ? block.degree
      : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-lg border bg-white shadow-sm transition-all ${
        included ? "border-blue-200" : "border-gray-200 opacity-60"
      }`}
    >
      {draggable && (
        <button
          className="cursor-grab touch-none text-gray-300 hover:text-gray-500"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
      )}

      <input
        type="checkbox"
        checked={included}
        onChange={onToggle}
        className="w-4 h-4 rounded accent-blue-600 flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{primary}</p>
        {secondary && <p className="text-xs text-gray-500 truncate">{secondary}</p>}
        {block.dates && <p className="text-xs text-gray-400">{block.dates}</p>}
      </div>

      {maxBullets !== undefined && (
        <span className="text-xs text-gray-400">max {maxBullets}</span>
      )}

      <button
        className="p-1 text-gray-400 hover:text-blue-600 rounded"
        onClick={onEdit}
      >
        <Pencil size={14} />
      </button>

      {showDelete && onDelete && (
        <button
          className="p-1 text-gray-400 hover:text-red-600 rounded"
          onClick={onDelete}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
