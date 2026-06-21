import { useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Cropper from "react-easy-crop";
import { X, Upload, RotateCcw } from "lucide-react";
import { getCroppedImg, CropArea } from "../api/cropImage";
import { useResumeStore } from "../store/useResumeStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Shape = "rect" | "circle";
type CropperShape = "rect" | "round"; // react-easy-crop's shape prop values

const CONFIGS: Record<Shape, { aspect: number; outW: number; outH: number; cropperShape: CropperShape }> = {
  rect: { aspect: 7 / 8, outW: 280, outH: 320, cropperShape: "rect" },
  circle: { aspect: 1, outW: 280, outH: 280, cropperShape: "round" },
};

export function PhotoUploadModal({ open, onClose }: Props) {
  const { settings, setSettings, refreshPreview, showToast } = useResumeStore();

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [shape, setShape] = useState<Shape>(
    (settings?.photo_shape as Shape) ?? "rect"
  );
  const [saving, setSaving] = useState(false);

  const { aspect, outW, outH, cropperShape } = CONFIGS[shape];

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const onCropComplete = useCallback((_: unknown, pixels: CropArea) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, outW, outH);
      const fd = new FormData();
      fd.append("file", blob, "photo.jpg");
      const res = await fetch("/api/upload/photo", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());

      // Save photo_shape to settings
      const updatedSettings = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, photo_shape: shape }),
      }).then((r) => r.json());
      setSettings(updatedSettings);

      await refreshPreview();
      showToast("Photo saved");
      onClose();
    } catch (e: any) {
      showToast(e.message ?? "Upload failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 p-6">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">Upload Photo</Dialog.Title>
            <Dialog.Close className="p-1 rounded hover:bg-gray-100">
              <X size={18} />
            </Dialog.Close>
          </div>

          {/* Shape toggle */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-sm font-medium text-gray-600">Crop shape:</span>
            <div className="flex gap-2">
              {(["rect", "circle"] as Shape[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setShape(s); setCrop({ x: 0, y: 0 }); setZoom(1); }}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    shape === s
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {s === "rect" ? "Rectangle" : "Circle"}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 ml-auto">
              {shape === "rect" ? "7:8 ratio" : "1:1 ratio"}
            </span>
          </div>

          {!imageSrc ? (
            <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
              <Upload size={28} className="text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-500">Click to upload a photo</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP</p>
              <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </label>
          ) : (
            <>
              {/* Cropper */}
              <div className="relative h-72 bg-black rounded-xl overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  cropShape={cropperShape}
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  style={{
                    containerStyle: { borderRadius: "0.75rem" },
                  }}
                />
              </div>

              {/* Zoom slider */}
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-500">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-blue-600"
                />
                <button
                  className="text-gray-400 hover:text-gray-600 p-1"
                  onClick={reset}
                  title="Choose a different image"
                >
                  <RotateCcw size={15} />
                </button>
              </div>

              {/* Output info */}
              <p className="text-xs text-gray-400 mt-2 text-center">
                Output: {outW}×{outH}px
                {shape === "circle" ? " • displayed as circle in resume" : " • displayed as rectangle in resume"}
              </p>
            </>
          )}

          <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
            <Dialog.Close className="btn-secondary">Cancel</Dialog.Close>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={!imageSrc || !croppedAreaPixels || saving}
            >
              {saving ? "Saving…" : "Save Photo"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
