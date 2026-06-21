import { X } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";

interface Props {
  onClose: () => void;
}

export function FullscreenPreview({ onClose }: Props) {
  const { previewHtml } = useResumeStore();

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Topbar */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-800 flex-shrink-0">
        <span className="text-white text-sm font-medium">Resume Preview</span>
        <button
          className="text-gray-300 hover:text-white p-1 rounded transition-colors"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      {/* Preview area — centred A4 page with scroll */}
      <div className="flex-1 overflow-auto flex justify-center py-6 bg-gray-900">
        <div
          className="bg-white shadow-2xl"
          style={{
            width: "794px",      /* A4 at 96 dpi */
            minHeight: "1123px",
            flexShrink: 0,
          }}
        >
          <iframe
            className="w-full h-full border-0"
            style={{ minHeight: "1123px" }}
            srcDoc={previewHtml}
            title="Fullscreen Resume Preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
