import { Maximize2 } from "lucide-react";
import { useResumeStore } from "../store/useResumeStore";

interface Props {
  onFullscreen: () => void;
}

export function LivePreview({ onFullscreen }: Props) {
  const { previewHtml, previewLoading } = useResumeStore();

  return (
    <div className="relative w-full h-full bg-gray-100 overflow-hidden">
      {previewLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
          <div className="text-sm text-gray-400 animate-pulse">Updating preview…</div>
        </div>
      )}
      <button
        onClick={onFullscreen}
        className="absolute top-3 right-3 z-20 p-1.5 bg-white/80 hover:bg-white rounded-md shadow text-gray-500 hover:text-gray-800 transition-colors"
        title="Fullscreen preview"
      >
        <Maximize2 size={15} />
      </button>
      <iframe
        className="w-full h-full border-0"
        srcDoc={previewHtml || "<p style='padding:2rem;color:#999'>Loading preview…</p>"}
        title="Resume Preview"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
